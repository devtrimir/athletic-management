<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ExternalTrainingAttendance;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class MarkMissingAttendanceBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function __construct(public readonly array $rows) {}

    public function handle(): void
    {
        if ($this->rows === []) {
            return;
        }

        ExternalTrainingAttendance::withoutGlobalScope(BelongsToOrganization::class)
            ->insertOrIgnore($this->rows);
    }
}
