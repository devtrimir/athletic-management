<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachSpecialAchievementRequest;
use App\Http\Requests\Coaches\UpdateCoachSpecialAchievementRequest;
use App\Models\Coach;
use App\Models\CoachSpecialAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CoachSpecialAchievementController extends Controller
{
    public function store(StoreCoachSpecialAchievementRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $coach);

        $coach->specialAchievements()->create([
            ...$request->safe()->except('order_document'),
            ...$this->storeOrderDocument($request, $coach),
            'organization_id' => $coach->organization_id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement recorded.')]);

        return to_route('coaches.special-achievements', $coach);
    }

    public function update(
        UpdateCoachSpecialAchievementRequest $request,
        Coach $coach,
        CoachSpecialAchievement $specialAchievement,
    ): RedirectResponse {
        Gate::authorize('manageSpecialAchievements', $coach);
        abort_unless($specialAchievement->coach_id === $coach->id, 404);

        $oldDocumentPath = $specialAchievement->order_document_path;
        $documentData = $this->storeOrderDocument($request, $coach);

        $specialAchievement->update([
            ...$request->safe()->except('order_document'),
            ...$documentData,
        ]);

        if ($documentData !== [] && $oldDocumentPath !== null) {
            $this->deleteOrderDocument($oldDocumentPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement updated.')]);

        return to_route('coaches.special-achievements', $coach);
    }

    public function destroy(Coach $coach, CoachSpecialAchievement $specialAchievement): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $coach);
        abort_unless($specialAchievement->coach_id === $coach->id, 404);

        if ($specialAchievement->order_document_path !== null) {
            $this->deleteOrderDocument($specialAchievement->order_document_path);
        }

        $specialAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement removed.')]);

        return to_route('coaches.special-achievements', $coach);
    }

    public function orderDocument(Coach $coach, CoachSpecialAchievement $specialAchievement): StreamedResponse
    {
        $this->authorizeOrderDocumentAccess($coach, $specialAchievement);

        return Storage::disk('local')->download(
            $specialAchievement->order_document_path,
            $specialAchievement->order_document_original_name,
        );
    }

    public function previewOrderDocument(Coach $coach, CoachSpecialAchievement $specialAchievement): BinaryFileResponse
    {
        $this->authorizeOrderDocumentAccess($coach, $specialAchievement);

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
        StoreCoachSpecialAchievementRequest|UpdateCoachSpecialAchievementRequest $request,
        Coach $coach,
    ): array {
        $file = $request->file('order_document');

        if ($file === null) {
            return [];
        }

        $path = $file->store(
            "coach-special-achievements/{$coach->organization_id}",
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

    private function authorizeOrderDocumentAccess(Coach $coach, CoachSpecialAchievement $specialAchievement): void
    {
        Gate::authorize('view', $coach);
        abort_unless($specialAchievement->coach_id === $coach->id, 404);
        abort_if($specialAchievement->order_document_path === null, 404);
        abort_unless(Storage::disk('local')->exists($specialAchievement->order_document_path), 404);
    }
}
