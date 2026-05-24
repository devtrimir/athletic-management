<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalsByMemberReport
{
    private const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'];

    /**
     * Return per-member medal counts ordered by total descending.
     *
     * @param  array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}  $filters
     * @return Collection<int, array{member: array{id: int, member_code: string, full_name_hi: string, full_name_en: string|null}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int, total: int}>
     */
    public function run(int $orgId, array $filters, int $limit = 50): Collection
    {
        $sessionId = $filters['session_id'] ?? null;
        $sportId = $filters['sport_id'] ?? null;
        $unitId = $filters['unit_id'] ?? null;
        $tierId = $filters['tier_id'] ?? null;

        $selects = [
            'm.id',
            'm.member_code',
            'm.full_name_hi',
            'm.full_name_en',
            DB::raw("SUM(CASE WHEN a.medal_type = 'GOLD'   THEN 1 ELSE 0 END) as GOLD"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'SILVER' THEN 1 ELSE 0 END) as SILVER"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'BRONZE' THEN 1 ELSE 0 END) as BRONZE"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'MERIT'  THEN 1 ELSE 0 END) as MERIT"),
            DB::raw('COUNT(*) as total'),
        ];

        $rows = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->select($selects)
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at')
            ->when($sessionId, fn ($q) => $q->where('t.session_id', $sessionId))
            ->when($sportId, fn ($q) => $q->where('e.sport_id', $sportId))
            ->when($tierId, fn ($q) => $q->where('t.tier_id', $tierId))
            ->when($unitId, fn ($q) => $q->where('m.current_unit_id', $unitId))
            ->groupBy('m.id', 'm.member_code', 'm.full_name_hi', 'm.full_name_en')
            ->orderByDesc('total')
            ->orderByDesc('GOLD')
            ->orderByDesc('SILVER')
            ->orderByDesc('BRONZE')
            ->limit($limit)
            ->get();

        return $rows->map(fn (object $row): array => [
            'member' => [
                'id' => $row->id,
                'member_code' => $row->member_code,
                'full_name_hi' => $row->full_name_hi,
                'full_name_en' => $row->full_name_en,
            ],
            'GOLD' => (int) $row->GOLD,
            'SILVER' => (int) $row->SILVER,
            'BRONZE' => (int) $row->BRONZE,
            'MERIT' => (int) $row->MERIT,
            'total' => (int) $row->total,
        ]);
    }
}
