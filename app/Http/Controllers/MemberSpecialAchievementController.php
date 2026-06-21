<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberSpecialAchievementRequest;
use App\Http\Requests\Members\UpdateMemberSpecialAchievementRequest;
use App\Models\Member;
use App\Models\MemberSpecialAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MemberSpecialAchievementController extends Controller
{
    public function store(StoreMemberSpecialAchievementRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $member);

        $member->specialAchievements()->create([
            ...$request->safe()->except('order_document'),
            ...$this->storeOrderDocument($request, $member),
            'organization_id' => $member->organization_id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement recorded.')]);

        return to_route('members.special-achievements', $member);
    }

    public function update(
        UpdateMemberSpecialAchievementRequest $request,
        Member $member,
        MemberSpecialAchievement $specialAchievement,
    ): RedirectResponse {
        Gate::authorize('manageSpecialAchievements', $member);
        abort_unless($specialAchievement->member_id === $member->id, 404);

        $oldDocumentPath = $specialAchievement->order_document_path;
        $documentData = $this->storeOrderDocument($request, $member);

        $specialAchievement->update([
            ...$request->safe()->except('order_document'),
            ...$documentData,
        ]);

        if ($documentData !== [] && $oldDocumentPath !== null) {
            $this->deleteOrderDocument($oldDocumentPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement updated.')]);

        return to_route('members.special-achievements', $member);
    }

    public function destroy(Member $member, MemberSpecialAchievement $specialAchievement): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $member);
        abort_unless($specialAchievement->member_id === $member->id, 404);

        if ($specialAchievement->order_document_path !== null) {
            $this->deleteOrderDocument($specialAchievement->order_document_path);
        }

        $specialAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement removed.')]);

        return to_route('members.special-achievements', $member);
    }

    public function orderDocument(Member $member, MemberSpecialAchievement $specialAchievement): StreamedResponse
    {
        $this->authorizeOrderDocumentAccess($member, $specialAchievement);

        return Storage::disk('local')->download(
            $specialAchievement->order_document_path,
            $specialAchievement->order_document_original_name,
        );
    }

    public function previewOrderDocument(Member $member, MemberSpecialAchievement $specialAchievement): BinaryFileResponse
    {
        $this->authorizeOrderDocumentAccess($member, $specialAchievement);

        $response = response()->file(
            Storage::disk('local')->path($specialAchievement->order_document_path),
            array_filter([
                'Content-Type' => $specialAchievement->order_document_mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $specialAchievement->order_document_original_name ?? 'order-document',
        );

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function storeOrderDocument(
        StoreMemberSpecialAchievementRequest|UpdateMemberSpecialAchievementRequest $request,
        Member $member,
    ): array {
        $file = $request->file('order_document');

        if ($file === null) {
            return [];
        }

        $path = $file->store(
            "member-special-achievements/{$member->organization_id}",
            'local',
        );

        return [
            'order_document_path' => $path,
            'order_document_original_name' => $file->getClientOriginalName(),
            'order_document_mime_type' => $file->getMimeType(),
            'order_document_size_bytes' => $file->getSize(),
        ];
    }

    private function deleteOrderDocument(string $path): void
    {
        Storage::disk('local')->delete($path);
        Storage::disk('public')->delete($path);
    }

    private function authorizeOrderDocumentAccess(Member $member, MemberSpecialAchievement $specialAchievement): void
    {
        Gate::authorize('view', $member);
        abort_unless($specialAchievement->member_id === $member->id, 404);
        abort_if($specialAchievement->order_document_path === null, 404);
        abort_unless(Storage::disk('local')->exists($specialAchievement->order_document_path), 404);
    }
}
