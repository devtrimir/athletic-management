<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalsFilters;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalsDetailReport
{
    /**
     * Return paginated flat medal rows with full context for the detail view.
     *
     * @param  array{
     *     year_from: int|null,
     *     year_to: int|null,
     *     sport_id: int|null,
     *     unit_id: int|null,
     *     tier_id: int|null,
     *     medal_type: string|null,
     *     gender: string|null,
     *     member_name: string|null,
     *     pno: string|null,
     *     tournament_id: int|null,
     *     event_name: string|null,
     * } $filters
     */
    /**
     * Return medal counts grouped by type for the same filter set.
     *
     * @param  array<string, mixed>  $filters
     * @return array{GOLD: int, SILVER: int, BRONZE: int, MERIT: int}
     */
    public function countByType(int $orgId, array $filters): array
    {
        $counts = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

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
            ->select(['a.medal_type', DB::raw('COUNT(*) as cnt')])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at')
            ->whereNotNull('tt.code')
            ->where('tt.code', '<>', 'OTHER');

        $liveRows = MedalsFilters::apply($query, $filters)
            ->groupBy('a.medal_type')
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
            ->select(['la.medal_type', DB::raw('COUNT(*) as cnt')])
            ->where('la.organization_id', $orgId)
            ->whereNull('m.deleted_at')
            ->whereIn('la.medal_type', array_keys($counts))
            ->whereRaw("COALESCE(tt.code, la.level, 'OTHER') <> 'OTHER'");

        $legacyRows = $this->applyLegacyFilters($legacyQuery, $filters)
            ->groupBy('la.medal_type')
            ->get();

        foreach ($liveRows->concat($legacyRows) as $row) {
            if (isset($counts[$row->medal_type])) {
                $counts[$row->medal_type] += (int) $row->cnt;
            }
        }

        return $counts;
    }

    public function run(int $orgId, array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $benefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\Achievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'promoted_from_rank',
                'promoted_to_rank',
                'cash_amount',
                'benefit_date',
                'order_reference',
                DB::raw('remarks as benefit_remarks'),
            ]);

        $query = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->leftJoin('sports as s', 's.id', '=', 'e.sport_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 't.session_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'a.id as achievement_id',
                'a.medal_type',
                'a.position',
                'a.remarks',
                'm.id as member_id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.gender',
                'u.name as unit_name',
                't.id as tournament_id',
                't.name as tournament_name',
                't.venue',
                't.date_from',
                't.date_to',
                'tt.code as tier_code',
                'tt.label_hi as tier_label_hi',
                'tt.label_en as tier_label_en',
                'ss.name as session_name',
                's.id as sport_id',
                's.name as sport_name',
                'e.id as event_id',
                'e.name as event_name',
                'e.discipline',
                'e.weight_category',
                'e.gender_class',
                'ab.benefit_type',
                'ab.promoted_from_rank',
                'ab.promoted_to_rank',
                'ab.cash_amount',
                'ab.benefit_date',
                'ab.order_reference',
                'ab.benefit_remarks',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $locale = app()->getLocale();

        $liveRows = MedalsFilters::apply($query, $filters)
            ->get()
            ->map(function (object $row) use ($locale): array {
                $tierLabel = $locale === 'en'
                    ? ($row->tier_label_en ?? $row->tier_label_hi)
                    : ($row->tier_label_hi ?? $row->tier_label_en);

                return [
                    'id' => (int) $row->achievement_id,
                    'sort_medal' => $this->medalSort($row->medal_type),
                    'sort_date' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : '',
                    'sort_name' => $row->full_name,
                    'medal_type' => $row->medal_type,
                    'position' => $row->position,
                    'remarks' => $row->remarks,
                    'member' => [
                        'id' => $row->member_id,
                        'member_code' => $row->member_code,
                        'pno' => $row->pno,
                        'full_name' => $row->full_name,
                        'rank' => $row->rank,
                        'gender' => $row->gender,
                        'unit_name' => $row->unit_name,
                    ],
                    'tournament' => [
                        'id' => $row->tournament_id,
                        'name' => $row->tournament_name,
                        'venue' => $row->venue,
                        'date_from' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : null,
                        'date_to' => $row->date_to !== null ? substr((string) $row->date_to, 0, 10) : null,
                        'tier_code' => $row->tier_code,
                        'tier_label' => $tierLabel,
                    ],
                    'session_name' => $row->session_name,
                    'sport' => [
                        'id' => $row->sport_id,
                        'name' => $row->sport_name,
                    ],
                    'event' => [
                        'id' => $row->event_id,
                        'name' => $row->event_name,
                        'discipline' => $row->discipline,
                        'weight_category' => $row->weight_category,
                        'gender_class' => $row->gender_class,
                    ],
                    'benefit' => $row->benefit_type !== null ? [
                        'benefit_type' => $row->benefit_type,
                        'promoted_from_rank' => $row->promoted_from_rank,
                        'promoted_to_rank' => $row->promoted_to_rank,
                        'cash_amount' => $row->cash_amount,
                        'benefit_date' => $row->benefit_date !== null ? substr((string) $row->benefit_date, 0, 10) : null,
                        'order_reference' => $row->order_reference,
                        'remarks' => $row->benefit_remarks,
                    ] : null,
                ];
            });

        $legacyRows = $this->legacyRows($orgId, $filters, $locale);
        $rows = $liveRows
            ->concat($legacyRows)
            ->sortBy([
                ['sort_medal', 'asc'],
                ['sort_date', 'desc'],
                ['sort_name', 'asc'],
            ])
            ->values()
            ->map(function (array $row): array {
                unset($row['sort_medal'], $row['sort_date'], $row['sort_name']);

                return $row;
            });

        $page = LengthAwarePaginator::resolveCurrentPage();

        return new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            ['path' => LengthAwarePaginator::resolveCurrentPath()],
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function legacyRows(int $orgId, array $filters, string $locale): Collection
    {
        $benefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\MemberLegacyAchievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'promoted_from_rank',
                'promoted_to_rank',
                'cash_amount',
                'benefit_date',
                'order_reference',
                DB::raw('remarks as benefit_remarks'),
            ]);

        $query = DB::table('member_legacy_achievements as la')
            ->join('members as m', 'm.id', '=', 'la.member_id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->leftJoin('sports as s', 's.id', '=', 'la.sport_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 'la.session_id')
            ->leftJoin('tournament_tiers as tt', 'tt.code', '=', 'la.level')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'la.id')
            ->select([
                'la.id as achievement_id',
                'la.medal_type',
                'la.position',
                'la.remarks',
                'm.id as member_id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.gender',
                'u.name as unit_name',
                'la.competition_details as tournament_name',
                'la.venue',
                'la.event_date as date_from',
                DB::raw('NULL as date_to'),
                DB::raw("COALESCE(tt.code, la.level, 'OTHER') as tier_code"),
                DB::raw("COALESCE(tt.label_hi, la.level, 'Other') as tier_label_hi"),
                DB::raw("COALESCE(tt.label_en, la.level, 'Other') as tier_label_en"),
                'ss.name as session_name',
                's.id as sport_id',
                DB::raw('COALESCE(s.name, la.sport_discipline) as sport_name'),
                'la.event as event_name',
                'la.discipline',
                'la.weight_category',
                'la.gender_class',
                'ab.benefit_type',
                'ab.promoted_from_rank',
                'ab.promoted_to_rank',
                'ab.cash_amount',
                'ab.benefit_date',
                'ab.order_reference',
                'ab.benefit_remarks',
            ])
            ->where('la.organization_id', $orgId)
            ->whereNull('m.deleted_at')
            ->whereIn('la.medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT']);

        return $this->applyLegacyFilters($query, $filters)
            ->get()
            ->map(function (object $row) use ($locale): array {
                $tierLabel = $locale === 'en'
                    ? ($row->tier_label_en ?? $row->tier_label_hi)
                    : ($row->tier_label_hi ?? $row->tier_label_en);

                return [
                    'id' => -1 * (int) $row->achievement_id,
                    'sort_medal' => $this->medalSort($row->medal_type),
                    'sort_date' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : '',
                    'sort_name' => $row->full_name,
                    'medal_type' => $row->medal_type,
                    'position' => $row->position,
                    'remarks' => $row->remarks,
                    'member' => [
                        'id' => $row->member_id,
                        'member_code' => $row->member_code,
                        'pno' => $row->pno,
                        'full_name' => $row->full_name,
                        'rank' => $row->rank,
                        'gender' => $row->gender,
                        'unit_name' => $row->unit_name,
                    ],
                    'tournament' => [
                        'id' => 0,
                        'name' => $row->tournament_name,
                        'venue' => $row->venue,
                        'date_from' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : null,
                        'date_to' => null,
                        'tier_code' => $row->tier_code,
                        'tier_label' => $tierLabel,
                    ],
                    'session_name' => $row->session_name,
                    'sport' => [
                        'id' => $row->sport_id ?? 0,
                        'name' => $row->sport_name,
                    ],
                    'event' => [
                        'id' => 0,
                        'name' => $row->event_name,
                        'discipline' => $row->discipline,
                        'weight_category' => $row->weight_category,
                        'gender_class' => $row->gender_class,
                    ],
                    'benefit' => $row->benefit_type !== null ? [
                        'benefit_type' => $row->benefit_type,
                        'promoted_from_rank' => $row->promoted_from_rank,
                        'promoted_to_rank' => $row->promoted_to_rank,
                        'cash_amount' => $row->cash_amount,
                        'benefit_date' => $row->benefit_date !== null ? substr((string) $row->benefit_date, 0, 10) : null,
                        'order_reference' => $row->order_reference,
                        'remarks' => $row->benefit_remarks,
                    ] : null,
                ];
            });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyLegacyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['year_from'] ?? null, fn (Builder $query, int $year): Builder => $query->whereYear('la.event_date', '>=', $year))
            ->when($filters['year_to'] ?? null, fn (Builder $query, int $year): Builder => $query->whereYear('la.event_date', '<=', $year))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('la.event_date', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('la.event_date', '<=', $date))
            ->when($this->filterIds($filters, 'sport_ids', 'sport_id'), fn (Builder $query, array $ids): Builder => $query->whereIn('la.sport_id', $ids))
            ->when($this->filterIds($filters, 'tier_ids', 'tier_id'), fn (Builder $query, array $ids): Builder => $query->whereIn('tt.id', $ids))
            ->when($this->filterIds($filters, 'session_ids', 'session_id'), fn (Builder $query, array $ids): Builder => $query->whereIn('la.session_id', $ids))
            ->when($this->filterIds($filters, 'unit_ids', 'unit_id'), fn (Builder $query, array $ids): Builder => $query->whereIn('m.current_unit_id', $ids))
            ->when($filters['member_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('m.id', $ids))
            ->when($filters['district_ids'] ?? [], fn (Builder $query, array $ids): Builder => $query->whereIn('m.posting_district_id', $ids))
            ->when($filters['rank_codes'] ?? [], fn (Builder $query, array $codes): Builder => $query->whereIn('m.rank', $codes))
            ->when($filters['designations'] ?? [], fn (Builder $query, array $codes): Builder => $query->whereIn('m.designation', $codes))
            ->when($filters['player_categories'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.player_category', $values))
            ->when($filters['player_levels'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.player_level', $values))
            ->when($filters['statuses'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.current_status', $values))
            ->when($filters['member_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('m.full_name', 'like', "%{$value}%"))
            ->when($filters['pno'] ?? null, fn (Builder $query, string $value): Builder => $query->where('m.pno', 'like', "%{$value}%"))
            ->when($this->filterIds($filters, 'tournament_ids', 'tournament_id'), fn (Builder $query): Builder => $query->whereRaw('1 = 0'))
            ->when($filters['tournament_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('la.competition_details', 'like', "%{$value}%"))
            ->when($filters['venue'] ?? null, fn (Builder $query, string $value): Builder => $query->where('la.venue', 'like', "%{$value}%"))
            ->when($filters['event_name'] ?? null, fn (Builder $query, string $value): Builder => $query->where('la.event', 'like', "%{$value}%"))
            ->when($this->filterIds($filters, 'event_ids', 'event_id'), fn (Builder $query): Builder => $query->whereRaw('1 = 0'))
            ->when($filters['disciplines'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('la.discipline', $values))
            ->when($filters['weight_categories'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('la.weight_category', $values))
            ->when($filters['event_gender_classes'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('la.gender_class', $values))
            ->when($this->filterStrings($filters, 'medal_types', 'medal_type'), fn (Builder $query, array $values): Builder => $query->whereIn('la.medal_type', $values))
            ->when($filters['genders'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('m.gender', $values))
            ->when($filters['position_from'] ?? null, fn (Builder $query, int $position): Builder => $query->where('la.position', '>=', $position))
            ->when($filters['position_to'] ?? null, fn (Builder $query, int $position): Builder => $query->where('la.position', '<=', $position))
            ->when(($filters['has_remarks'] ?? null) !== null, fn (Builder $query): Builder => $filters['has_remarks']
                ? $query->whereNotNull('la.remarks')->where('la.remarks', '<>', '')
                : $query->where(fn (Builder $query): Builder => $query->whereNull('la.remarks')->orWhere('la.remarks', '')))
            ->when($filters['benefit_types'] ?? [], fn (Builder $query, array $values): Builder => $query->whereIn('ab.benefit_type', $values))
            ->when($filters['benefit_date_from'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('ab.benefit_date', '>=', $date))
            ->when($filters['benefit_date_to'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('ab.benefit_date', '<=', $date))
            ->when($filters['order_reference'] ?? null, fn (Builder $query, string $value): Builder => $query->where('ab.order_reference', 'like', "%{$value}%"));
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

    private function medalSort(?string $medalType): int
    {
        return match ($medalType) {
            'GOLD' => 0,
            'SILVER' => 1,
            'BRONZE' => 2,
            'MERIT' => 3,
            default => 4,
        };
    }
}
