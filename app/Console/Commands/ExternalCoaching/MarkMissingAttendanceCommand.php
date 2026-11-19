<?php

declare(strict_types=1);

namespace App\Console\Commands\ExternalCoaching;

use App\Services\ExternalCoaching\MarkMissingAttendanceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Throwable;

#[Signature('external-coaching:mark-missing-attendance {--date= : Mark only this date (Y-m-d). Without it, yesterday and the missed days before it are marked.} {--catch-up-days=7 : How many days back (up to yesterday) to check when --date is not given.} {--dry-run : Run without writing rows.} {--chunk=500 : Number of assignments processed per scan chunk.} {--insert-chunk=1000 : Number of attendance rows inserted per DB insert batch.} {--queue : Dispatch insert jobs to the attendance queue instead of inserting synchronously.}')]
#[Description('Mark absent attendance automatically when external coaches miss a day submission.')]
class MarkMissingAttendanceCommand extends Command
{
    public function __construct(private readonly MarkMissingAttendanceService $attendanceService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $chunkSize = $this->resolveChunkSize();
            $insertChunkSize = $this->resolveInsertChunkSize();

            foreach ($this->resolveAttendanceDates() as $attendanceDate) {
                $this->report($this->attendanceService->markMissingForDate(
                    $attendanceDate,
                    $chunkSize,
                    $insertChunkSize,
                    (bool) $this->option('dry-run'),
                    (bool) $this->option('queue'),
                ));
            }
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $summary
     */
    private function report(array $summary): void
    {
        $status = $summary['dry_run'] ? 'dry-run complete' : 'complete';

        if ($summary['dispatched_jobs'] > 0) {
            $this->info(sprintf(
                'Auto mark %s for %s: scanned=%d, missing_pairs=%d, dispatched_jobs=%d',
                $status,
                $summary['attendance_date'],
                $summary['assignments_scanned'],
                $summary['missing_pairs'],
                $summary['dispatched_jobs'],
            ));

            return;
        }

        $this->info(sprintf(
            'Auto mark %s for %s: scanned=%d, missing_pairs=%d, inserted=%d, skipped=%d, errors=%d',
            $status,
            $summary['attendance_date'],
            $summary['assignments_scanned'],
            $summary['missing_pairs'],
            $summary['inserted'],
            $summary['skipped'],
            $summary['errors'],
        ));
    }

    /**
     * One explicit date, or the missed days up to yesterday (oldest first). Marking is
     * idempotent, so a day that was already handled is simply skipped.
     *
     * @return list<Carbon>
     */
    private function resolveAttendanceDates(): array
    {
        if (trim((string) $this->option('date')) !== '') {
            return [$this->resolveAttendanceDate()];
        }

        $rawDays = trim((string) $this->option('catch-up-days'));
        if (! preg_match('/^\d+$/', $rawDays) || (int) $rawDays < 1) {
            throw new \RuntimeException('Catch-up days must be a positive integer.');
        }

        $days = min((int) $rawDays, 31);

        return array_map(
            fn (int $daysAgo): Carbon => Carbon::today()->subDays($daysAgo),
            range($days, 1),
        );
    }

    private function resolveAttendanceDate(): Carbon
    {
        $rawDate = trim((string) $this->option('date'));
        if ($rawDate === '') {
            return Carbon::today()->subDay();
        }

        $parsed = Carbon::createFromFormat('Y-m-d', $rawDate);

        if ($parsed === false) {
            throw new \RuntimeException('Attendance date must use format YYYY-MM-DD.');
        }

        $attendanceDate = $parsed->startOfDay();

        if ($attendanceDate->gt(Carbon::today())) {
            throw new \RuntimeException('Attendance date cannot be in the future.');
        }

        return $attendanceDate;
    }

    private function resolveChunkSize(): int
    {
        $rawChunkSize = trim((string) $this->option('chunk'));
        if (! preg_match('/^\d+$/', $rawChunkSize)) {
            throw new \RuntimeException('Chunk size must be a positive integer.');
        }

        $chunkSize = (int) $rawChunkSize;
        if ($chunkSize < 1) {
            throw new \RuntimeException('Chunk size must be a positive integer.');
        }

        return $chunkSize;
    }

    private function resolveInsertChunkSize(): int
    {
        $rawChunkSize = trim((string) $this->option('insert-chunk'));
        if (! preg_match('/^\d+$/', $rawChunkSize)) {
            throw new \RuntimeException('Insert chunk size must be a positive integer.');
        }

        $chunkSize = (int) $rawChunkSize;
        if ($chunkSize < 1) {
            throw new \RuntimeException('Insert chunk size must be a positive integer.');
        }

        return $chunkSize;
    }
}
