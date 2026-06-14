<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class NewJoinersReport
{
    /**
     * Return members whose joining_date falls within the requested range.
     *
     * Date range is resolved in this priority:
     *  1. Explicit from_date / to_date filters
     *  2. session_id → derives start_year-01-01 … end_year-12-31 from sport_sessions
     *
     * @param  array{session_id?: int|null, sport_id?: int|null, unit_id?: int|null, tier_id?: int|null, from_date?: string|null, to_date?: string|null}  $filters
     * @return Collection<int, array{member: array{id: int, member_code: string, pno: string|null, full_name: string, rank: string|null, player_category: string}, unit: array{id: int, name: string, name: string}|null, joining_date: string}>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $unitId = $filters['unit_id'] ?? null;
        $fromDate = $filters['from_date'] ?? null;
        $toDate = $filters['to_date'] ?? null;
        $sessionId = $filters['session_id'] ?? null;

        // Derive date bounds from session when no explicit range given.
        if ($sessionId !== null && $fromDate === null && $toDate === null) {
            $session = DB::table('sport_sessions')
                ->select(['start_year', 'end_year'])
                ->where('id', $sessionId)
                ->first();

            if ($session !== null) {
                $fromDate = $session->start_year.'-01-01';
                $toDate = $session->end_year.'-12-31';
            }
        }

        $rows = DB::table('members as m')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->select([
                'm.id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.player_category',
                'm.joining_date',
                'u.id as unit_id',
                'u.name as unit_name',
            ])
            ->where('m.organization_id', $orgId)
            ->whereNull('m.deleted_at')
            ->whereNotNull('m.joining_date')
            ->when($fromDate, fn ($q) => $q->where('m.joining_date', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('m.joining_date', '<=', $toDate))
            ->when($unitId, fn ($q) => $q->where('m.current_unit_id', $unitId))
            ->orderBy('m.joining_date')
            ->orderBy('m.full_name')
            ->get();

        return $rows->map(fn (object $row): array => [
            'member' => [
                'id' => $row->id,
                'member_code' => $row->member_code,
                'pno' => $row->pno,
                'full_name' => $row->full_name,
                'rank' => $row->rank,
                'player_category' => $row->player_category,
            ],
            'unit' => $row->unit_id !== null
                ? ['id' => $row->unit_id, 'name' => $row->unit_name]
                : null,
            'joining_date' => substr((string) $row->joining_date, 0, 10),
        ]);
    }
}
