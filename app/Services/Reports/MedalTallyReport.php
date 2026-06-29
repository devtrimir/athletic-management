<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalsFilters;
use Illuminate\Database\Query\Builder;
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

        $legacyBenefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\MemberLegacyAchievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'benefit_date',
                'order_reference',
            ]);

        $legacyQuery = DB::table('member_legacy_achievements as la')
            ->join('members as m', 'm.id', '=', 'la.member_id')
            ->leftJoin('tournament_tiers as tt', 'tt.code', '=', 'la.level')
            ->leftJoinSub($legacyBenefitSub, 'ab', 'ab.benefitable_id', '=', 'la.id')
            ->select([
                'tt.id',
                DB::raw("COALESCE(tt.code, la.level, 'OTHER') as code"),
                DB::raw("COALESCE(tt.label_hi, la.level, 'Other') as label_hi"),
                DB::raw("COALESCE(tt.label_en, la.level, 'Other') as label_en"),
                DB::raw('COALESCE(tt.weight, 0) as weight'),
                'la.medal_type',
                DB::raw('COUNT(*) as cnt'),
            ])
            ->where('la.organization_id', $orgId)
            ->whereNull('m.deleted_at')
            ->whereIn('la.medal_type', array_keys(self::BLANK));

        $legacyRows = $this->applyLegacyFilters($legacyQuery, $filters)
            ->groupBy('tt.id', 'tt.code', 'tt.label_hi', 'tt.label_en', 'tt.weight', 'la.level', 'la.medal_type')
            ->get();

        return $rows
            ->concat($legacyRows)
            ->groupBy(fn (object $row): string => (string) ($row->code ?? 'OTHER'))
            ->map(function (Collection $tierRows): array {
                $first = $tierRows->first();
                $isDisplayOnly = ($first->code ?? 'OTHER') === 'OTHER';
                $counts = self::BLANK;

                if (! $isDisplayOnly) {
                    foreach ($tierRows as $row) {
                        if (isset($counts[$row->medal_type])) {
                            $counts[$row->medal_type] += (int) $row->cnt;
                        }
                    }
                }

                return [
                    'tier' => [
                        'code' => $first->code ?? 'OTHER',
                        'label' => app()->getLocale() === 'en'
                            ? ($first->label_en ?? $first->label_hi ?? 'Other')
                            : ($first->label_hi ?? $first->label_en ?? 'Other'),
                        'weight' => (int) ($first->weight ?? 0),
                    ],
                    'display_only' => $isDisplayOnly ? (int) $tierRows->sum('cnt') : 0,
                ] + $counts;
            })
            ->values();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyLegacyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['year_from'] ?? null, fn ($query, int $year) => $query->whereYear('la.event_date', '>=', $year))
            ->when($filters['year_to'] ?? null, fn ($query, int $year) => $query->whereYear('la.event_date', '<=', $year))
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->whereDate('la.event_date', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->whereDate('la.event_date', '<=', $date))
            ->when($this->filterIds($filters, 'sport_ids', 'sport_id'), fn ($query, array $ids) => $query->whereIn('la.sport_id', $ids))
            ->when($this->filterIds($filters, 'tier_ids', 'tier_id'), fn ($query, array $ids) => $query->whereIn('tt.id', $ids))
            ->when($this->filterIds($filters, 'session_ids', 'session_id'), fn ($query, array $ids) => $query->whereIn('la.session_id', $ids))
            ->when($this->filterIds($filters, 'unit_ids', 'unit_id'), fn ($query, array $ids) => $query->whereIn('m.current_unit_id', $ids))
            ->when($filters['member_ids'] ?? [], fn ($query, array $ids) => $query->whereIn('m.id', $ids))
            ->when($filters['district_ids'] ?? [], fn ($query, array $ids) => $query->whereIn('m.posting_district_id', $ids))
            ->when($filters['rank_codes'] ?? [], fn ($query, array $codes) => $query->whereIn('m.rank', $codes))
            ->when($filters['designations'] ?? [], fn ($query, array $codes) => $query->whereIn('m.designation', $codes))
            ->when($filters['player_categories'] ?? [], fn ($query, array $values) => $query->whereIn('m.player_category', $values))
            ->when($filters['player_levels'] ?? [], fn ($query, array $values) => $query->whereIn('m.player_level', $values))
            ->when($filters['statuses'] ?? [], fn ($query, array $values) => $query->whereIn('m.current_status', $values))
            ->when($filters['member_name'] ?? null, fn ($query, string $value) => $query->where('m.full_name', 'like', "%{$value}%"))
            ->when($filters['pno'] ?? null, fn ($query, string $value) => $query->where('m.pno', 'like', "%{$value}%"))
            ->when($this->filterIds($filters, 'tournament_ids', 'tournament_id'), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($filters['tournament_name'] ?? null, fn ($query, string $value) => $query->where('la.competition_details', 'like', "%{$value}%"))
            ->when($filters['venue'] ?? null, fn ($query, string $value) => $query->where('la.venue', 'like', "%{$value}%"))
            ->when($filters['event_name'] ?? null, fn ($query, string $value) => $query->where('la.event', 'like', "%{$value}%"))
            ->when($this->filterIds($filters, 'event_ids', 'event_id'), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($filters['disciplines'] ?? [], fn ($query, array $values) => $query->whereIn('la.discipline', $values))
            ->when($filters['weight_categories'] ?? [], fn ($query, array $values) => $query->whereIn('la.weight_category', $values))
            ->when($filters['event_gender_classes'] ?? [], fn ($query, array $values) => $query->whereIn('la.gender_class', $values))
            ->when($this->filterStrings($filters, 'medal_types', 'medal_type'), fn ($query, array $values) => $query->whereIn('la.medal_type', $values))
            ->when($filters['genders'] ?? [], fn ($query, array $values) => $query->whereIn('m.gender', $values))
            ->when($filters['position_from'] ?? null, fn ($query, int $position) => $query->where('la.position', '>=', $position))
            ->when($filters['position_to'] ?? null, fn ($query, int $position) => $query->where('la.position', '<=', $position))
            ->when(($filters['has_remarks'] ?? null) !== null, fn ($query) => $filters['has_remarks']
                ? $query->whereNotNull('la.remarks')->where('la.remarks', '<>', '')
                : $query->where(fn ($query) => $query->whereNull('la.remarks')->orWhere('la.remarks', '')))
            ->when($filters['benefit_types'] ?? [], fn ($query, array $values) => $query->whereIn('ab.benefit_type', $values))
            ->when($filters['benefit_date_from'] ?? null, fn ($query, string $date) => $query->whereDate('ab.benefit_date', '>=', $date))
            ->when($filters['benefit_date_to'] ?? null, fn ($query, string $date) => $query->whereDate('ab.benefit_date', '<=', $date))
            ->when($filters['order_reference'] ?? null, fn ($query, string $value) => $query->where('ab.order_reference', 'like', "%{$value}%"));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<int>
     */
    private function filterIds(array $filters, string $arrayKey, string $legacyKey): array
    {
        $values = $filters[$arrayKey] ?? [];

        if ($values === [] && ($filters[$legacyKey] ?? null) !== null) {
            $values = [$filters[$legacyKey]];
        }

        return array_values(array_map(intval(...), (array) $values));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<string>
     */
    private function filterStrings(array $filters, string $arrayKey, string $legacyKey): array
    {
        $values = $filters[$arrayKey] ?? [];

        if ($values === [] && ($filters[$legacyKey] ?? null) !== null) {
            $values = [$filters[$legacyKey]];
        }

        return array_values(array_filter(array_map(fn (mixed $value): string => (string) $value, (array) $values)));
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
                DB::raw("'live' as medal_source"),
                'a.medal_type',
                DB::raw("COALESCE(tt.code, 'OTHER') as tier_code"),
                DB::raw('COUNT(DISTINCT m.id) as player_count'),
            ])
            ->where('t.organization_id', $orgId)
            ->where('team.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $liveRows = MedalsFilters::apply($query, $filters)
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
                'medal_source',
                'a.medal_type',
                'tt.code',
            )
            ->get();

        $legacyBenefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\MemberLegacyAchievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'benefit_date',
                'order_reference',
            ]);

        $legacyQuery = DB::table('member_legacy_achievements as la')
            ->join('members as m', 'm.id', '=', 'la.member_id')
            ->joinSub($activeTeamMemberIds, 'active_tm', function ($join): void {
                $join->on('active_tm.member_id', '=', 'la.member_id')
                    ->on('active_tm.session_id', '=', 'la.session_id');
            })
            ->join('team_members as member_tm', 'member_tm.id', '=', 'active_tm.team_member_id')
            ->join('teams as team', 'team.id', '=', 'member_tm.team_id')
            ->leftJoin('tournament_tiers as tt', 'tt.code', '=', 'la.level')
            ->leftJoin('sports as ts', 'ts.id', '=', 'team.sport_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 'team.session_id')
            ->leftJoin('units as tu', 'tu.id', '=', 'team.unit_id')
            ->leftJoin('districts as td', 'td.id', '=', 'team.district_id')
            ->leftJoinSub($legacyBenefitSub, 'ab', 'ab.benefitable_id', '=', 'la.id')
            ->select([
                'team.id as team_id',
                'team.name as team_name',
                'ts.name as sport_name',
                'ss.name as session_name',
                'tu.name as unit_name',
                'td.name as district_name',
                'la.id as event_id',
                DB::raw("'legacy' as medal_source"),
                'la.medal_type',
                DB::raw("COALESCE(tt.code, la.level, 'OTHER') as tier_code"),
                DB::raw('COUNT(DISTINCT m.id) as player_count'),
            ])
            ->where('la.organization_id', $orgId)
            ->where('team.organization_id', $orgId)
            ->whereNull('team.deleted_at')
            ->whereNull('m.deleted_at')
            ->whereIn('la.medal_type', array_keys(self::BLANK));

        $legacyRows = $this->applyLegacyFilters($legacyQuery, $filters)
            ->when($this->filterIds($filters, 'team_ids', 'team_id'), fn (Builder $query, array $ids): Builder => $query->whereIn('team.id', $ids))
            ->groupBy(
                'team.id',
                'team.name',
                'ts.name',
                'ss.name',
                'tu.name',
                'td.name',
                'la.id',
                'medal_source',
                'la.medal_type',
                'tt.code',
                'la.level',
            )
            ->get();

        $medalUnits = $liveRows
            ->concat($legacyRows)
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
                    'events' => $rows
                        ->map(fn (object $row): string => $row->medal_source.':'.$row->event_id)
                        ->unique()
                        ->count(),
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
