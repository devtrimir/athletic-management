<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalsFilters;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalsByMemberReport
{
    private const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'];

    /**
     * Return per-member medal counts ordered by total descending.
     *
     * @param  array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}  $filters
     * @return Collection<int, array{member: array{id: int, member_code: string, full_name: string, full_name: string|null}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int, total: int}>
     */
    public function run(int $orgId, array $filters, int $limit = 50): Collection
    {
        $selects = [
            'm.id',
            'm.member_code',
            'm.full_name',
            DB::raw("SUM(CASE WHEN a.medal_type = 'GOLD'   THEN 1 ELSE 0 END) as GOLD"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'SILVER' THEN 1 ELSE 0 END) as SILVER"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'BRONZE' THEN 1 ELSE 0 END) as BRONZE"),
            DB::raw("SUM(CASE WHEN a.medal_type = 'MERIT'  THEN 1 ELSE 0 END) as MERIT"),
            DB::raw('COUNT(*) as total'),
        ];

        $benefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\Achievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'benefit_date',
                'order_reference',
            ]);

        $query = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select($selects)
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $rows = MedalsFilters::apply($query, $filters)
            ->groupBy('m.id', 'm.member_code', 'm.full_name', 'm.full_name')
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
                'full_name' => $row->full_name,
            ],
            'GOLD' => (int) $row->GOLD,
            'SILVER' => (int) $row->SILVER,
            'BRONZE' => (int) $row->BRONZE,
            'MERIT' => (int) $row->MERIT,
            'total' => (int) $row->total,
        ]);
    }
}
