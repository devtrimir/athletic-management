<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalsFilters;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalTallyReport
{
    private const BLANK = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

    /**
     * Run the medal-tally pivot query.
     *
     * Returns one row per tier that has at least one achievement, with medal
     * counts keyed by type (GOLD/SILVER/BRONZE/MERIT) and a nested tier object.
     *
     * @param  array{year_from: int|null, year_to: int|null, session_id?: int|null, sport_id: int|null, unit_id: int|null, tier_id: int|null}  $filters
     * @return Collection<int, array{tier: array{code: string, label: string, weight: int}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int, display_only: int}>
     */
    public function run(int $orgId, array $filters): Collection
    {
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
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select('tt.id', 'tt.code', 'tt.label_hi', 'tt.label_en', 'tt.weight', 'a.medal_type', DB::raw('COUNT(*) as cnt'))
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $rows = MedalsFilters::apply($query, $filters)
            ->groupBy('tt.id', 'tt.code', 'tt.label_hi', 'tt.label_en', 'tt.weight', 'a.medal_type')
            ->orderByDesc(DB::raw('COALESCE(tt.weight, 0)'))
            ->get();

        return $rows
            ->groupBy(fn (object $row): string => (string) ($row->id ?? 'other'))
            ->map(function (Collection $tierRows): array {
                $first = $tierRows->first();
                $isDisplayOnly = ($first->code ?? 'OTHER') === 'OTHER';
                $counts = $isDisplayOnly ? [] : $tierRows->pluck('cnt', 'medal_type')->toArray();

                return [
                    'tier' => [
                        'code' => $first->code ?? 'OTHER',
                        'label' => app()->getLocale() === 'en'
                            ? ($first->label_en ?? $first->label_hi ?? 'Other')
                            : ($first->label_hi ?? $first->label_en ?? 'Other'),
                        'weight' => (int) ($first->weight ?? 0),
                    ],
                    'display_only' => $isDisplayOnly ? (int) $tierRows->sum('cnt') : 0,
                ] + array_merge(self::BLANK, $counts);
            })
            ->values();
    }

    /**
     * Run a team medal-tally query.
     *
     * `OTHER` tier medals stay visible through display_only but are excluded
     * from medal columns and total/rank calculations.
     *
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array{team: array{id: int, name: string, sport_name: string|null, session_name: string|null, unit_name: string|null, district_name: string|null}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int, display_only: int, events: int, players: int}>
     */
    public function runTeams(int $orgId, array $filters): Collection
    {
        $benefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\Achievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'benefit_date',
                'order_reference',
            ]);

        $activeTeamMemberIds = DB::table('team_members as tm')
            ->select('tm.member_id', 'tm.session_id', DB::raw('MAX(tm.id) as team_member_id'))
            ->whereNull('tm.left_on')
            ->groupBy('tm.member_id', 'tm.session_id');

        $query = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoinSub($activeTeamMemberIds, 'active_tm', function ($join): void {
                $join->on('active_tm.member_id', '=', 'p.member_id')
                    ->on('active_tm.session_id', '=', 'p.session_id');
            })
            ->leftJoin('team_members as member_tm', 'member_tm.id', '=', 'active_tm.team_member_id')
            ->leftJoin('teams as team', function ($join): void {
                $join->whereRaw('team.id = COALESCE(p.team_id, member_tm.team_id)');
            })
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoin('sports as ts', 'ts.id', '=', 'team.sport_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 'team.session_id')
            ->leftJoin('units as tu', 'tu.id', '=', 'team.unit_id')
            ->leftJoin('districts as td', 'td.id', '=', 'team.district_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'team.id as team_id',
                'team.name as team_name',
                'ts.name as sport_name',
                'ss.name as session_name',
                'tu.name as unit_name',
                'td.name as district_name',
                'e.id as event_id',
                'a.medal_type',
                DB::raw("COALESCE(tt.code, 'OTHER') as tier_code"),
                DB::raw('COUNT(DISTINCT m.id) as player_count'),
            ])
            ->where('t.organization_id', $orgId)
            ->where('team.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $medalUnits = MedalsFilters::apply($query, $filters)
            ->whereNull('team.deleted_at')
            ->whereNotNull('team.id')
            ->groupBy(
                'team.id',
                'team.name',
                'ts.name',
                'ss.name',
                'tu.name',
                'td.name',
                'e.id',
                'a.medal_type',
                'tt.code',
            )
            ->get()
            ->groupBy('team_id')
            ->map(function (Collection $rows): array {
                $first = $rows->first();
                $counts = self::BLANK;

                foreach ($rows as $row) {
                    if ($row->tier_code !== 'OTHER' && isset($counts[$row->medal_type])) {
                        $counts[$row->medal_type]++;
                    }
                }

                return [
                    'team' => [
                        'id' => (int) $first->team_id,
                        'name' => $first->team_name,
                        'sport_name' => $first->sport_name,
                        'session_name' => $first->session_name,
                        'unit_name' => $first->unit_name,
                        'district_name' => $first->district_name,
                    ],
                    'GOLD' => $counts['GOLD'],
                    'SILVER' => $counts['SILVER'],
                    'BRONZE' => $counts['BRONZE'],
                    'MERIT' => $counts['MERIT'],
                    'display_only' => $rows->where('tier_code', 'OTHER')->count(),
                    'events' => $rows->pluck('event_id')->unique()->count(),
                    'players' => $rows->sum('player_count'),
                ];
            });

        return $medalUnits
            ->sortBy([
                ['GOLD', 'desc'],
                ['SILVER', 'desc'],
                ['BRONZE', 'desc'],
                ['MERIT', 'desc'],
                ['team.name', 'asc'],
            ])
            ->values();
    }
}
