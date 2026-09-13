<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class UnitHeadcountReport
{
    /**
     * Return per-unit athlete headcount, pivoted by player_category (GD / SPORTS_QUOTA).
     *
     * @param  array{session_id?: int|null, sport_id?: int|null, unit_id?: int|null, tier_id?: int|null}  $filters
     * @return Collection<int, array{unit: array{id: int, name: string, name: string, unit_type: string}, total: int, GD: int, SPORTS_QUOTA: int}>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $unitId = $filters['unit_id'] ?? null;

        $rows = DB::table('units as u')
            ->leftJoin('members as m', function ($join) use ($orgId): void {
                $join->on('m.current_unit_id', '=', 'u.id')
                    ->where('m.organization_id', $orgId)
                    ->whereNull('m.deleted_at')
                    ->where('m.current_status', 'ACTIVE');
            })
            ->select([
                'u.id',
                'u.name',
                'u.unit_type',
                DB::raw('COUNT(m.id) as total'),
                DB::raw("SUM(CASE WHEN m.player_category = 'GD'      THEN 1 ELSE 0 END) as gd_count"),
                DB::raw("SUM(CASE WHEN m.player_category = 'SPORTS_QUOTA' THEN 1 ELSE 0 END) as sports_quota_count"),
            ])
            ->where('u.organization_id', $orgId)
            ->when($unitId, fn ($q) => $q->where('u.id', $unitId))
            ->groupBy('u.id', 'u.name', 'u.unit_type')
            ->orderBy('u.unit_type')
            ->orderBy('u.name')
            ->get();

        return $rows->map(fn (object $row): array => [
            'unit' => [
                'id' => $row->id,
                'name' => $row->name,
                'unit_type' => $row->unit_type,
            ],
            'total' => (int) $row->total,
            'GD' => (int) ($row->gd_count ?? $row->gd ?? $row->GD ?? 0),
            'SPORTS_QUOTA' => (int) ($row->sports_quota_count ?? $row->sports_quota ?? $row->SPORTS_QUOTA ?? 0),
        ]);
    }
}
