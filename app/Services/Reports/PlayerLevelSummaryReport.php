<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PlayerLevelSummaryReport
{
    /** Canonical display order for player levels. */
    private const array LEVEL_ORDER = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'];

    /**
     * Return ACTIVE member counts grouped by player_level.
     *
     * Only levels with at least one qualifying member are included.
     * Rows are ordered by canonical level progression:
     * ZONAL → NATIONAL → INTERNATIONAL → AIPSC.
     *
     * @param  array{session_id?: int|null, sport_id?: int|null, unit_id?: int|null, tier_id?: int|null}  $filters
     * @return Collection<int, array{player_level: string, total: int}>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $unitId = $filters['unit_id'] ?? null;

        $rows = DB::table('members')
            ->select([
                'player_level',
                DB::raw('COUNT(*) as total'),
            ])
            ->where('organization_id', $orgId)
            ->where('current_status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->when($unitId, fn ($q) => $q->where('current_unit_id', $unitId))
            ->groupBy('player_level')
            ->get();

        // Sort in PHP to remain DB-agnostic (MySQL FIELD() is not available in SQLite).
        $order = array_flip(self::LEVEL_ORDER);

        return $rows
            ->sortBy(fn (object $row): int => $order[$row->player_level] ?? 99)
            ->values()
            ->map(fn (object $row): array => [
                'player_level' => $row->player_level,
                'total' => (int) $row->total,
            ]);
    }
}
