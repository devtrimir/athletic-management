<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Incharges\StoreInchargeSpecialAchievementRequest;
use App\Http\Requests\Incharges\UpdateInchargeSpecialAchievementRequest;
use App\Models\Incharge;
use App\Models\InchargeSpecialAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InchargeSpecialAchievementController extends Controller
{
    public function store(StoreInchargeSpecialAchievementRequest $request, Incharge $incharge): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $incharge);

        $incharge->specialAchievements()->create([
            ...$request->safe()->except('order_document'),
            ...$this->storeOrderDocument($request, $incharge),
            'organization_id' => $incharge->organization_id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement recorded.')]);

        return to_route('incharges.special-achievements', $incharge);
    }

    public function update(
        UpdateInchargeSpecialAchievementRequest $request,
        Incharge $incharge,
        InchargeSpecialAchievement $specialAchievement,
    ): RedirectResponse {
        Gate::authorize('manageSpecialAchievements', $incharge);
        abort_unless($specialAchievement->incharge_id === $incharge->id, 404);

        $oldDocumentPath = $specialAchievement->order_document_path;
        $documentData = $this->storeOrderDocument($request, $incharge);

        $specialAchievement->update([
            ...$request->safe()->except('order_document'),
            ...$documentData,
        ]);

        if ($documentData !== [] && $oldDocumentPath !== null) {
            $this->deleteOrderDocument($oldDocumentPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement updated.')]);

        return to_route('incharges.special-achievements', $incharge);
    }

    public function destroy(Incharge $incharge, InchargeSpecialAchievement $specialAchievement): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $incharge);
        abort_unless($specialAchievement->incharge_id === $incharge->id, 404);

        if ($specialAchievement->order_document_path !== null) {
            $this->deleteOrderDocument($specialAchievement->order_document_path);
        }

        $specialAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Special achievement removed.')]);

        return to_route('incharges.special-achievements', $incharge);
    }

    public function orderDocument(Incharge $incharge, InchargeSpecialAchievement $specialAchievement): StreamedResponse
    {
        $this->authorizeOrderDocumentAccess($incharge, $specialAchievement);

        return Storage::disk('local')->download(
            $specialAchievement->order_document_path,
            $specialAchievement->order_document_original_name,
        );
    }

    public function previewOrderDocument(Incharge $incharge, InchargeSpecialAchievement $specialAchievement): BinaryFileResponse
    {
        $this->authorizeOrderDocumentAccess($incharge, $specialAchievement);

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
        StoreInchargeSpecialAchievementRequest|UpdateInchargeSpecialAchievementRequest $request,
        Incharge $incharge,
    ): array {
        $file = $request->file('order_document');

        if ($file === null) {
            return [];
        }

        $path = $file->store(
            "incharge-special-achievements/{$incharge->organization_id}",
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

    private function authorizeOrderDocumentAccess(Incharge $incharge, InchargeSpecialAchievement $specialAchievement): void
    {
        Gate::authorize('view', $incharge);
        abort_unless($specialAchievement->incharge_id === $incharge->id, 404);
        abort_if($specialAchievement->order_document_path === null, 404);
        abort_unless(Storage::disk('local')->exists($specialAchievement->order_document_path), 404);
    }
}
