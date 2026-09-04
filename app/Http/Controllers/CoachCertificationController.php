<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachCertificationRequest;
use App\Models\Coach;
use App\Models\CoachCertification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CoachCertificationController extends Controller
{
    private const ATTACHMENT_DIRECTORY = 'coach-certifications';

    public function store(StoreCoachCertificationRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('updateCertifications', $coach);

        $data = $request->validated();
        $id = isset($data['id']) && is_numeric($data['id']) ? (int) $data['id'] : null;

        $payload = [
            'name' => $data['name'],
            'certificate_type' => $data['certificate_type'] ?? null,
            'issuer' => $data['issuer'] ?? null,
            'issued_at' => $data['issued_at'] ?? null,
            'expired_at' => $data['expired_at'] ?? null,
        ];

        $file = $request->file('attachment');
        $attachmentData = $file !== null ? $this->storeAttachment($file, $coach) : [];

        if ($id !== null) {
            $certification = $coach->certifications()->whereKey($id)->firstOrFail();
            $oldAttachmentPath = $certification->attachment_path;
            $certification->update([...$payload, ...$attachmentData]);

            if ($attachmentData !== [] && $oldAttachmentPath !== null) {
                $this->deleteAttachment($oldAttachmentPath);
            }
        } else {
            $coach->certifications()->create([...$payload, ...$attachmentData]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certification saved.')]);

        return to_route('coaches.certifications', $coach);
    }

    public function destroy(Coach $coach, CoachCertification $certification): RedirectResponse
    {
        Gate::authorize('updateCertifications', $coach);

        abort_if($certification->coach_id !== $coach->id, 404);

        if ($certification->attachment_path !== null) {
            $this->deleteAttachment($certification->attachment_path);
        }

        $certification->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certification removed.')]);

        return to_route('coaches.certifications', $coach);
    }

    public function downloadAttachment(Coach $coach, CoachCertification $certification): StreamedResponse
    {
        $this->authorizeAttachmentAccess($coach, $certification);

        return Storage::disk('local')->download(
            $certification->attachment_path,
            $certification->attachment_original_name,
        );
    }

    public function previewAttachment(Coach $coach, CoachCertification $certification): BinaryFileResponse
    {
        $this->authorizeAttachmentAccess($coach, $certification);

        $response = response()->file(
            Storage::disk('local')->path($certification->attachment_path),
            array_filter([
                'Content-Type' => $certification->mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $certification->attachment_original_name ?? 'attachment',
        );

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function storeAttachment(UploadedFile $file, Coach $coach): array
    {
        $path = $file->store(
            self::ATTACHMENT_DIRECTORY."/{$coach->organization_id}",
            'local',
        );

        return [
            'attachment_path' => $path,
            'attachment_original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
        ];
    }

    private function deleteAttachment(string $path): void
    {
        if (! str_starts_with($path, self::ATTACHMENT_DIRECTORY.'/')) {
            return;
        }

        Storage::disk('local')->delete($path);
        Storage::disk('public')->delete($path);
    }

    private function authorizeAttachmentAccess(Coach $coach, CoachCertification $certification): void
    {
        Gate::authorize('view', $coach);
        abort_if($certification->coach_id !== $coach->id, 404);
        abort_if($certification->attachment_path === null, 404);
        abort_unless(str_starts_with($certification->attachment_path, self::ATTACHMENT_DIRECTORY.'/'), 404);
        abort_unless(Storage::disk('local')->exists($certification->attachment_path), 404);
    }
}
