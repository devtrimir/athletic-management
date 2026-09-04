<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Events\MemberImportFinished;
use App\Events\MemberImportRowProcessed;
use App\Imports\MembersFirstSheetImport;
use App\Imports\MembersImport;
use App\Models\Import;
use Closure;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
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

        $onProgress = $this->makeProgressCallback();

        $import = new MembersImport($this->import->organization_id, $this->import->filename, $onProgress);

        try {
            // Workbooks without a "Members" sheet (CSV uploads, renamed sheets)
            // make the reader throw — fall back to reading the first sheet.
            try {
                Excel::import($import, $absolutePath);
            } catch (SheetNotFoundException) {
                // Handled by the fallback below.
            }

            if (! $import->sheetProcessed()) {
                $import = new MembersFirstSheetImport($this->import->organization_id, $this->import->filename, $onProgress);
                Excel::import($import, $absolutePath);
            }

            $this->recordResult($import);
            Storage::delete($this->filePath);
        } catch (Throwable $exception) {
            $this->markFailed($exception->getMessage());
            $this->publishSafely(new MemberImportFinished($this->import->refresh(), ['created' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0], $exception->getMessage()));

            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception?->getMessage() ?? 'Unknown error');
        Storage::delete($this->filePath);

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

        $this->publishSafely(new MemberImportFinished($this->import->refresh(), [
            'created' => $import->createdCount(),
            'updated' => $import->updatedCount(),
            'skipped' => $import->skippedCount(),
            'failed' => $import->failedCount(),
        ], $templateError));
    }

    /**
     * Per-row progress reporter handed to the import. Transport errors are
     * swallowed by publishSafely so a websocket outage can never fail the
     * import or flip its status — the DB work is the source of truth.
     *
     * @return (Closure(int, string|null, string, string, list<string>, int): void)|null
     */
    private function makeProgressCallback(): ?Closure
    {
        if ($this->attempts() > 1) {
            // A retry re-runs the whole file after the first attempt rolled
            // back; replaying row events would duplicate checkmarks. The
            // finished event still tells the modal the final outcome.
            return null;
        }

        return function (int $row, ?string $pno, string $name, string $result, array $errors, int $processed): void {
            $this->publishSafely(new MemberImportRowProcessed(
                $this->import->id,
                $this->import->organization_id,
                $row,
                $pno,
                $name,
                $result,
                $errors,
                $processed,
            ));
        };
    }

    /**
     * Broadcast now; never let a transport failure bubble into the job —
     * the import itself has already succeeded at that point.
     */
    private function publishSafely(ShouldBroadcastNow $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $exception) {
            Log::warning('Member import broadcast failed', [
                'import_id' => $this->import->id,
                'event' => $event::class,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function markFailed(string $message): void
    {
        $this->import->update([
            'status' => Import::STATUS_FAILED,
            'error_log' => json_encode([['row' => 0, 'name' => $this->import->filename, 'errors' => [$message]]], JSON_UNESCAPED_UNICODE),
        ]);
    }
}
