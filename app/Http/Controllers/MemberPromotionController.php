<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberPromotionRequest;
use App\Http\Requests\Members\UpdateMemberPromotionRequest;
use App\Models\Achievement;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\MemberPromotion;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberPromotionController extends Controller
{
    public function store(StoreMemberPromotionRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        $data = array_merge($request->validated(), [
            'from_rank' => $request->input('from_rank') ?: $member->rank,
        ]);

        $promotion = MemberPromotion::create(array_merge(
            $data,
            [
                'organization_id' => $member->organization_id,
                'member_id' => $member->id,
                'recorded_by' => $request->user()?->id,
            ],
        ));

        $this->syncEvidences($promotion, $member, $request->validated('evidences', []));
        $this->syncMemberPromotionDate($member);

        if (! empty($promotion->to_rank)) {
            $member->update(['rank' => $promotion->to_rank]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion recorded.')]);

        return $this->redirectAfterMutation($member);
    }

    public function update(UpdateMemberPromotionRequest $request, Member $member, MemberPromotion $promotion): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        $data = array_merge($request->validated(), [
            'from_rank' => $request->input('from_rank') ?: $promotion->from_rank ?: $member->rank,
        ]);

        $promotion->update($data);

        if ($request->filled('evidences')) {
            $promotion->evidences()->delete();
            $this->syncEvidences($promotion, $member, $request->validated('evidences', []));
        }

        $this->syncMemberPromotionDate($member);

        if (! empty($promotion->to_rank)) {
            $member->update(['rank' => $promotion->to_rank]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion updated.')]);

        return $this->redirectAfterMutation($member);
    }

    public function destroy(Member $member, MemberPromotion $promotion): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        $promotion->delete();
        $this->syncMemberPromotionDate($member);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion removed.')]);

        return $this->redirectAfterMutation($member);
    }

    private function redirectAfterMutation(Member $member): RedirectResponse
    {
        $path = parse_url((string) request()->headers->get('referer', ''), PHP_URL_PATH);

        if (is_string($path) && str_starts_with($path, '/coaches/')) {
            return back();
        }

        return to_route('members.show', $member);
    }

    /**
     * @param  array<int, array{type: string, id: int}>  $evidences
     */
    private function syncEvidences(MemberPromotion $promotion, Member $member, array $evidences): void
    {
        $legacyIds = MemberLegacyAchievement::where('member_id', $member->id)->pluck('id')->all();
        $achievementIds = Achievement::whereHas('participation', fn ($q) => $q->where('member_id', $member->id))->pluck('id')->all();
        $participationIds = Participation::where('member_id', $member->id)->pluck('id')->all();

        foreach ($evidences as $evidence) {
            $isAllowed = match ($evidence['type']) {
                'member_legacy_achievement' => in_array($evidence['id'], $legacyIds, true),
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

    private function syncMemberPromotionDate(Member $member): void
    {
        $latestPromotionDate = MemberPromotion::query()
            ->where('member_id', $member->id)
            ->whereNotNull('promotion_date')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->value('promotion_date');

        $member->update([
            'promotion_date' => $latestPromotionDate,
        ]);
    }
}
