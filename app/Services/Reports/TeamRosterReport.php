<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeamRosterReport
{
    /**
     * Return one row per team with a nested member list.
     *
     * Uses a LEFT JOIN on team_members so teams with zero members
     * still appear (with an empty members array).
     *
     * @param  array{session_id: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}  $filters
     * @return Collection<int, array{
     *     team: array{id: int, name_hi: string, in_charge_hi: string|null, sport: array{id: int, name_hi: string}, session: array{id: int, name: string}, unit: array{name_hi: string}},
     *     members: list<array{member: array{id: int, member_code: string, full_name_hi: string, rank: string|null, player_level: string|null}, role: string, joined_on: string|null, left_on: string|null}>
     * }>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $sessionId = $filters['session_id'] ?? null;
        $sportId = $filters['sport_id'] ?? null;
        $unitId = $filters['unit_id'] ?? null;

        $rows = DB::table('teams as t')
            ->join('sports as sp', 'sp.id', '=', 't.sport_id')
            ->join('sport_sessions as ss', 'ss.id', '=', 't.session_id')
            ->join('units as u', 'u.id', '=', 't.unit_id')
            ->leftJoin('team_members as tm', 'tm.team_id', '=', 't.id')
            ->leftJoin('members as m', function ($join) {
                $join->on('m.id', '=', 'tm.member_id')
                    ->whereNull('m.deleted_at');
            })
            ->select([
                't.id as team_id',
                't.name_hi as team_name_hi',
                't.in_charge_hi',
                'sp.id as sport_id',
                'sp.name_hi as sport_name_hi',
                'ss.id as session_id',
                'ss.name as session_name',
                'u.name_hi as unit_name_hi',
                'm.id as member_id',
                'm.member_code',
                'm.full_name_hi as member_name_hi',
                'm.rank',
                'm.player_level',
                'tm.role',
                'tm.joined_on',
                'tm.left_on',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->when($sessionId, fn ($q) => $q->where('t.session_id', $sessionId))
            ->when($sportId, fn ($q) => $q->where('t.sport_id', $sportId))
            ->when($unitId, fn ($q) => $q->where('t.unit_id', $unitId))
            ->orderByDesc('ss.start_year')
            ->orderBy('t.name_hi')
            ->orderByRaw("CASE tm.role WHEN 'CAPTAIN' THEN 0 WHEN 'PLAYER' THEN 1 ELSE 2 END")
            ->get();

        return $rows
            ->groupBy('team_id')
            ->map(function (Collection $teamRows): array {
                $first = $teamRows->first();
                $members = $teamRows
                    ->filter(fn (object $r) => $r->member_id !== null)
                    ->map(fn (object $r): array => [
                        'member' => [
                            'id' => $r->member_id,
                            'member_code' => $r->member_code,
                            'full_name_hi' => $r->member_name_hi,
                            'rank' => $r->rank,
                            'player_level' => $r->player_level,
                        ],
                        'role' => $r->role,
                        'joined_on' => $r->joined_on,
                        'left_on' => $r->left_on,
                    ])
                    ->values()
                    ->all();

                return [
                    'team' => [
                        'id' => $first->team_id,
                        'name_hi' => $first->team_name_hi,
                        'in_charge_hi' => $first->in_charge_hi,
                        'sport' => ['id' => $first->sport_id,    'name_hi' => $first->sport_name_hi],
                        'session' => ['id' => $first->session_id,  'name' => $first->session_name],
                        'unit' => ['name_hi' => $first->unit_name_hi],
                    ],
                    'members' => $members,
                ];
            })
            ->values();
    }
}
