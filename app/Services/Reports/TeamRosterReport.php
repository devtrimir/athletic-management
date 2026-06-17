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
     *     team: array{id: int, name: string, in_charge: string|null, sport: array{id: int, name: string}, session: array{id: int, name: string}, unit: array{name: string}},
     *     members: list<array{member: array{id: int, member_code: string, full_name: string, rank: string|null, player_level: string|null}, role: string, joined_on: string|null, left_on: string|null}>
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
                't.name as team_name',
                't.in_charge',
                'sp.id as sport_id',
                'sp.name as sport_name',
                'ss.id as session_id',
                'ss.name as session_name',
                'u.name as unit_name',
                'm.id as member_id',
                'm.member_code',
                'm.full_name as member_name',
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
            ->orderBy('t.name')
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
                            'full_name' => $r->member_name,
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
                        'name' => $first->team_name,
                        'in_charge' => $first->in_charge,
                        'sport' => ['id' => $first->sport_id,    'name' => $first->sport_name],
                        'session' => ['id' => $first->session_id,  'name' => $first->session_name],
                        'unit' => ['name' => $first->unit_name],
                    ],
                    'members' => $members,
                ];
            })
            ->values();
    }
}
