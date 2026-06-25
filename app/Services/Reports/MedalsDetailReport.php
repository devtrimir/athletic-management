<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalsFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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

        $rows = MedalsFilters::apply($query, $filters)
            ->groupBy('a.medal_type')
            ->get();

        $counts = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        foreach ($rows as $row) {
            if (isset($counts[$row->medal_type])) {
                $counts[$row->medal_type] = (int) $row->cnt;
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

        $paginator = MedalsFilters::apply($query, $filters)
            ->orderByRaw("FIELD(a.medal_type, 'GOLD', 'SILVER', 'BRONZE', 'MERIT')")
            ->orderByDesc('t.date_from')
            ->orderBy('m.full_name')
            ->paginate($perPage);

        $locale = app()->getLocale();

        $paginator->through(function (object $row) use ($locale): array {
            $tierLabel = $locale === 'en'
                ? ($row->tier_label_en ?? $row->tier_label_hi)
                : ($row->tier_label_hi ?? $row->tier_label_en);

            return [
                'id' => $row->achievement_id,
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

        return $paginator;
    }
}
