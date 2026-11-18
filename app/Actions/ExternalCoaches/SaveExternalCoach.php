<?php

declare(strict_types=1);

namespace App\Actions\ExternalCoaches;

use App\Jobs\CompressExternalCoachDocument;
use App\Models\ExternalCoach;
use App\Models\User;
use App\Services\FileCompressor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SaveExternalCoach
{
    public function __construct(private readonly FileCompressor $compressor) {}

    private const EXTRA_KEYS = ['photo', 'remove_photo', 'sport_ids', 'training_venue_ids', 'documents', 'status_reason'];

    /**
     * Create (when $externalCoach is null) or update an external coach together with
     * status history, photo, sports, training venues and documents.
     *
     * @param  array<string, mixed>  $validated
     */
    public function __invoke(?ExternalCoach $externalCoach, array $validated, User $user): ExternalCoach
    {
        return DB::transaction(function () use ($externalCoach, $validated, $user): ExternalCoach {
            $attributes = Arr::except($validated, self::EXTRA_KEYS);
            $previousStatus = $externalCoach?->status;

            if ($externalCoach === null) {
                $externalCoach = ExternalCoach::create([
                    ...$attributes,
                    'organization_id' => (int) $user->organization_id,
                    'created_by' => $user->id,
                    'updated_by' => $user->id,
                ]);
            } else {
                if (($attributes['password'] ?? null) === null) {
                    unset($attributes['password']);
                }

                $externalCoach->update([...$attributes, 'updated_by' => $user->id]);
            }

            if ($previousStatus !== $externalCoach->status) {
                $externalCoach->statusHistory()->create([
                    'status' => $externalCoach->status,
                    'reason' => $validated['status_reason'] ?? null,
                    'recorded_by' => $user->id,
                    'recorded_at' => now(),
                ]);
            }

            $externalCoach->sports()->sync($validated['sport_ids'] ?? []);
            $externalCoach->trainingVenues()->sync($validated['training_venue_ids'] ?? []);
            $this->savePhoto($externalCoach, $validated['photo'] ?? null, (bool) ($validated['remove_photo'] ?? false));
            $this->saveDocuments($externalCoach, $validated['documents'] ?? [], $user);

            return $externalCoach;
        });
    }

    private function savePhoto(ExternalCoach $externalCoach, ?UploadedFile $photo, bool $remove): void
    {
        if ($photo === null && ! $remove) {
            return;
        }

        if ($externalCoach->photo_path !== null) {
            Storage::disk('public')->delete($externalCoach->photo_path);
        }

        $path = $photo?->store("external-coach-photos/{$externalCoach->organization_id}", 'public');

        if ($path !== null) {
            $this->compressor->compressInPlace('public', $path);
        }

        $externalCoach->update(['photo_path' => $path]);
    }

    /**
     * @param  array<int, array{type: string, file: UploadedFile}>  $documents
     */
    private function saveDocuments(ExternalCoach $externalCoach, array $documents, User $user): void
    {
        foreach ($documents as $document) {
            $file = $document['file'];

            $stored = $externalCoach->documents()->create([
                'type' => $document['type'],
                'path' => $file->store("external-coach-documents/{$externalCoach->id}", 'local'),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => (string) $file->getMimeType(),
                'size_bytes' => $file->getSize(),
                'uploaded_by' => $user->id,
            ]);

            CompressExternalCoachDocument::dispatch($stored)->afterCommit();
        }
    }
}
