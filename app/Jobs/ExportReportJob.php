<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exports\ReportExport;
use App\Services\Reports\AchievementHistoryReport;
use App\Services\Reports\MedalsByMemberReport;
use App\Services\Reports\MedalTallyReport;
use App\Services\Reports\NewJoinersReport;
use App\Services\Reports\PlayerLevelSummaryReport;
use App\Services\Reports\ResignationDismissalLogReport;
use App\Services\Reports\TeamRosterReport;
use App\Services\Reports\UnitHeadcountReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel;

class ExportReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $uuid,
        public readonly int $orgId,
        public readonly string $key,
        /** @var array<string, int|string|null> */
        public readonly array $filters,
        public readonly string $title,
    ) {}

    public function handle(
        MedalTallyReport $medalTally,
        MedalsByMemberReport $medalsByMember,
        TeamRosterReport $teamRoster,
        ResignationDismissalLogReport $resignationDismissal,
        UnitHeadcountReport $unitHeadcount,
        PlayerLevelSummaryReport $playerLevelSummary,
        NewJoinersReport $newJoiners,
        AchievementHistoryReport $achievementHistory,
    ): void {
        $data = match ($this->key) {
            'medal-tally'             => $medalTally->run($this->orgId, $this->filters),
            'medals-by-member'        => $medalsByMember->run($this->orgId, $this->filters, (int) ($this->filters['limit'] ?? 50)),
            'team-roster'             => $teamRoster->run($this->orgId, $this->filters),
            'resignation-dismissal-log' => $resignationDismissal->run(
                $this->orgId,
                $this->filters,
                $this->filters['from_date'] ?? null,
                $this->filters['to_date']   ?? null,
                $this->filters['status']    ?? null,
            ),
            'unit-headcount'          => $unitHeadcount->run($this->orgId, $this->filters),
            'player-level-summary'    => $playerLevelSummary->run($this->orgId, $this->filters),
            'new-joiners'             => $newJoiners->run($this->orgId, $this->filters),
            'achievement-history'     => $achievementHistory->run($this->orgId, $this->filters),
            default                   => collect(),
        };

        /** @var array<int, string> $headings */
        $headings = $data->isNotEmpty() ? array_keys((array) $data->first()) : [];

        Excel::store(
            new ReportExport($data, $headings, $this->title),
            "exports/{$this->uuid}.xlsx",
        );

        Cache::put("export:{$this->uuid}", [
            'status' => 'ready',
            'path'   => "exports/{$this->uuid}.xlsx",
        ], now()->addMinutes(30));
    }
}
