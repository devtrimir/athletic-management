<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Events\MemberImportFinished;
use App\Imports\MembersFirstSheetImport;
use App\Imports\MembersImport;
use App\Models\Import;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Exceptions\SheetNotFoundException;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;

class ProcessMemberImportJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [1, 5, 10];

    public int $uniqueFor = 3600;

    public function __construct(
        public readonly Import $import,
        public readonly string $filePath,
    ) {}

    public function uniqueId(): string
    {
        return (string) $this->import->id;
    }

    public function handle(): void
    {
        $absolutePath = Storage::path($this->filePath);

        $import = new MembersImport($this->import->organization_id, $this->import->filename);

        try {
            // Workbooks without a "Members" sheet (CSV uploads, renamed sheets)
            // make the reader throw — fall back to reading the first sheet.
            try {
                Excel::import($import, $absolutePath);
            } catch (SheetNotFoundException) {
                // Handled by the fallback below.
            }

            if (! $import->sheetProcessed()) {
                $import = new MembersFirstSheetImport($this->import->organization_id, $this->import->filename);
                Excel::import($import, $absolutePath);
            }

            $this->recordResult($import);
        } catch (Throwable $exception) {
            $this->markFailed($exception->getMessage());
            $this->broadcastFinished(['created' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0], $exception->getMessage());

            throw $exception;
        } finally {
            Storage::delete($this->filePath);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception?->getMessage() ?? 'Unknown error');

        Log::error('Member import job failed', [
            'import_id' => $this->import->id,
            'organization_id' => $this->import->organization_id,
            'error' => $exception?->getMessage(),
        ]);
    }

    private function recordResult(MembersImport $import): void
    {
        $templateError = $import->templateError();

        $this->import->update([
            'status' => $templateError !== null ? Import::STATUS_FAILED : Import::STATUS_COMPLETED,
            'error_log' => $import->rowErrors() === [] ? null : json_encode($import->rowErrors(), JSON_UNESCAPED_UNICODE),
            'uploaded_at' => now(),
        ]);

        $this->broadcastFinished([
            'created' => $import->createdCount(),
            'updated' => $import->updatedCount(),
            'skipped' => $import->skippedCount(),
            'failed' => $import->failedCount(),
        ], $templateError);
    }

    /**
     * @param  array{created: int, updated: int, skipped: int, failed: int}  $counts
     */
    private function broadcastFinished(array $counts, ?string $templateError): void
    {
        // Retries after a mid-import crash must not re-notify subscribers.
        if ($this->attempts() > 1) {
            return;
        }

        broadcast(new MemberImportFinished($this->import->refresh(), $counts, $templateError));
    }

    private function markFailed(string $message): void
    {
        $this->import->update([
            'status' => Import::STATUS_FAILED,
            'error_log' => json_encode([['row' => 0, 'name' => $this->import->filename, 'errors' => [$message]]], JSON_UNESCAPED_UNICODE),
        ]);
    }
}
