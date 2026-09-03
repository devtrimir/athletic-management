<?php

declare(strict_types=1);

namespace App\Actions\Members;

use App\Jobs\ProcessMemberImportJob;
use App\Models\Import;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class QueueMemberImport
{
    /**
     * Store the uploaded workbook, register it as PROCESSING, and dispatch the
     * background import job. Re-uploading the same file (same sha256) reuses
     * the existing Import record and queues a fresh run.
     */
    public function __invoke(User $user, UploadedFile $file): Import
    {
        $orgId = (int) $user->organization_id;
        $storedPath = $file->store('imports/'.$orgId);

        $record = Import::updateOrCreate(
            ['organization_id' => $orgId, 'sha256' => hash_file('sha256', Storage::path($storedPath))],
            [
                'uploaded_by' => $user->id,
                'filename' => $file->getClientOriginalName(),
                'sheet_count' => 1,
                'status' => Import::STATUS_PROCESSING,
                'error_log' => null,
                'uploaded_at' => now(),
            ],
        );

        ProcessMemberImportJob::dispatch($record, $storedPath);

        return $record;
    }
}
