<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberPromotionRequest;
use App\Http\Requests\Members\UpdateMemberPromotionRequest;
use App\Models\Achievement;
use App\Models\Coach;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Rank;
use App\Services\PromotionSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MemberPromotionController extends Controller
{
    public function __construct(
        private readonly PromotionSyncService $promotionSyncService,
    ) {}

    public function store(StoreMemberPromotionRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        $validated = $request->validated();
        unset($validated['document']);

        $data = $this->promotionData($validated, $request->boolean('cash_reward_only'), $member->rank);

        $promotion = MemberPromotion::create(array_merge(
            $data,
            $this->storeDocument($request, $member),
            [
                'organization_id' => $member->organization_id,
                'member_id' => $member->id,
                'recorded_by' => $request->user()?->id,
            ],
        ));

        $this->syncEvidences($promotion, $member, $request->validated('evidences', []));
        $this->syncMemberPromotionState($member);
        $this->promotionSyncService->syncFromMember($promotion);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion recorded.')]);

        return $this->redirectAfterMutation($member);
    }

    public function update(UpdateMemberPromotionRequest $request, Member $member, MemberPromotion $promotion): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        $validated = $request->validated();
        unset($validated['document']);

        $data = $this->promotionData(
            $validated,
            $request->boolean('cash_reward_only'),
            $promotion->from_rank ?: $member->rank,
        );

        $oldDocumentPath = $promotion->document_path;
        $documentData = $this->storeDocument($request, $member);

        $promotion->update(array_merge($data, $documentData));

        if ($documentData !== [] && $oldDocumentPath !== null) {
            $this->deleteDocument($oldDocumentPath);
        }

        if ($request->filled('evidences')) {
            $promotion->evidences()->delete();
            $this->syncEvidences($promotion, $member, $request->validated('evidences', []));
        }

        $this->syncMemberPromotionState($member);
        $this->promotionSyncService->syncFromMember($promotion);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion updated.')]);

        return $this->redirectAfterMutation($member);
    }

    public function destroy(Member $member, MemberPromotion $promotion): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        if ($promotion->document_path !== null) {
            $this->deleteDocument($promotion->document_path);
        }

        $this->promotionSyncService->deleteForMember($promotion);
        $promotion->delete();
        $this->syncMemberPromotionState($member);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion removed.')]);

        return $this->redirectAfterMutation($member);
    }

    public function document(Member $member, MemberPromotion $promotion): StreamedResponse
    {
        $this->authorizeDocumentAccess($member, $promotion);

        return Storage::disk('local')->download(
            $promotion->document_path,
            $promotion->document_original_name,
        );
    }

    public function previewDocument(Member $member, MemberPromotion $promotion): BinaryFileResponse
    {
        $this->authorizeDocumentAccess($member, $promotion);

        $response = response()->file(
            Storage::disk('local')->path($promotion->document_path),
            array_filter([
                'Content-Type' => $promotion->document_mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $promotion->document_original_name ?? 'promotion-document',
        );

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function storeDocument(
        StoreMemberPromotionRequest|UpdateMemberPromotionRequest $request,
        Member $member,
    ): array {
        $file = $request->file('document');

        if ($file === null) {
            return [];
        }

        $path = $file->store(
            "member-promotions/{$member->organization_id}",
            'local',
        );

        return [
            'document_path' => $path,
            'document_original_name' => $file->getClientOriginalName(),
            'document_mime_type' => $file->getMimeType(),
            'document_size_bytes' => $file->getSize(),
        ];
    }

    private function deleteDocument(string $path): void
    {
        Storage::disk('local')->delete($path);
    }

    private function authorizeDocumentAccess(Member $member, MemberPromotion $promotion): void
    {
        Gate::authorize('view', $member);
        abort_unless($promotion->member_id === $member->id, 404);
        abort_if($promotion->document_path === null, 404);
        abort_unless(Storage::disk('local')->exists($promotion->document_path), 404);
    }

    private function redirectAfterMutation(Member $member): RedirectResponse
    {
        $path = parse_url((string) request()->headers->get('referer', ''), PHP_URL_PATH);

        if (is_string($path) && str_starts_with($path, '/coaches/')) {
            return back();
        }

        return to_route('members.promotions', $member);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function promotionData(array $data, bool $cashRewardOnly, ?string $fallbackRank): array
    {
        unset($data['cash_reward_only']);

        $fromRank = filled($data['from_rank'] ?? null) ? (string) $data['from_rank'] : $fallbackRank;

        if ($cashRewardOnly) {
            $rewardRank = $fromRank ?: '';

            return array_merge($data, [
                'promotion_date' => null,
                'from_rank' => $rewardRank ?: null,
                'to_rank' => filled($data['to_rank'] ?? null) ? (string) $data['to_rank'] : $rewardRank,
                'reason' => null,
                'remarks' => null,
            ]);
        }

        return array_merge($data, [
            'from_rank' => $fromRank,
        ]);
    }

    /**
     * @param  array<int, array{type: string, id: int}>  $evidences
     */
    private function syncEvidences(MemberPromotion $promotion, Member $member, array $evidences): void
    {
        $achievementIds = Achievement::forMember($member)->pluck('id')->all();
        $participationIds = Participation::forMember($member)->pluck('id')->all();

        foreach ($evidences as $evidence) {
            $isAllowed = match ($evidence['type']) {
                'achievement' => in_array($evidence['id'], $achievementIds, true),
                'participation' => in_array($evidence['id'], $participationIds, true),
            };

            abort_if(! $isAllowed, 422, 'Invalid promotion evidence.');

            PromotionEvidence::create([
                'organization_id' => $member->organization_id,
                'member_promotion_id' => $promotion->id,
                'evidencable_type' => $evidence['type'],
                'evidencable_id' => $evidence['id'],
            ]);
        }
    }

    private function syncMemberPromotionState(Member $member): void
    {
        $latestPromotionDate = MemberPromotion::query()
            ->where('member_id', $member->id)
            ->whereNotNull('promotion_date')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        $latestPromotionForRank = MemberPromotion::query()
            ->where('member_id', $member->id)
            ->whereColumn('from_rank', '!=', 'to_rank')
            ->orderByRaw('promotion_date IS NULL')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        $newRank = $latestPromotionForRank?->to_rank ?? $member->initial_rank ?? $member->rank;

        $member->update([
            'promotion_date' => $latestPromotionDate?->promotion_date,
            'rank' => $newRank,
        ]);

        if ($newRank) {
            $rankModel = Rank::query()
                ->where('code', $newRank)
                ->orWhere('name', $newRank)
                ->first();

            if ($rankModel) {
                Coach::query()
                    ->where('member_id', $member->id)
                    ->update(['rank_master_id' => $rankModel->id]);
            }
        }
    }
}
