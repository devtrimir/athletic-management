<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalMemberScope;
use App\Support\Reports\MedalsFilters;
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
            ->leftJoin('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'a.id as achievement_id',
                'a.medal_type',
                'e.id as event_id',
                'e.event_type',
                'p.lineup_member_ids',
                'm.id as member_id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.designation',
                'm.gender',
                'm.player_category',
                'm.player_level',
                'm.current_status',
                'm.current_unit_id',
                'm.posting_district_id',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->where(fn ($query) => $query->whereNull('p.member_id')->orWhereNull('m.deleted_at'))
            ->whereNotNull('tt.code')
            ->where('tt.code', '<>', 'OTHER');

        $liveRows = MedalsFilters::apply($query, MedalMemberScope::withoutMemberScopedFilters($filters))->get();
        $lineupMembers = MedalMemberScope::lineupMembers($liveRows);

        foreach ($liveRows
            ->filter(fn (object $row): bool => MedalMemberScope::rowMatches($row, $lineupMembers, $filters))
            ->unique(fn (object $row): string => $row->event_type === 'team'
                ? 'team:'.$row->event_id.':'.$row->medal_type
                : 'achievement:'.$row->achievement_id) as $row) {
            if (isset($counts[$row->medal_type])) {
                $counts[$row->medal_type]++;
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
            ->leftJoin('members as m', 'm.id', '=', 'p.member_id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->leftJoin('teams as team', 'team.id', '=', 'p.team_id')
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
                'p.team_id',
                'p.lineup_member_ids',
                'm.id as member_id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.designation',
                'm.gender',
                'm.player_category',
                'm.player_level',
                'm.current_status',
                'm.current_unit_id',
                'm.posting_district_id',
                'u.name as unit_name',
                'team.name as team_name',
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
                'e.event_type',
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
            ->where(fn ($query) => $query->whereNull('p.member_id')->orWhereNull('m.deleted_at'));

        $locale = app()->getLocale();

        $rawRows = MedalsFilters::apply($query, MedalMemberScope::withoutMemberScopedFilters($filters))->get();
        $lineupMembers = MedalMemberScope::lineupMembers($rawRows);

        $liveRows = $rawRows
            ->flatMap(function (object $row) use ($locale, $lineupMembers): array {
                $members = $row->member_id !== null
                    ? [$row]
                    : $this->expandedLineupRows($row, $lineupMembers);

                return array_map(fn (object $memberRow): array => $this->mapRow($memberRow, $locale), $members);
            })
            ->filter(fn (array $row): bool => MedalMemberScope::memberMatchesFilters($row['member'], $filters));

        $rows = $liveRows
            ->sortBy([
                ['sort_medal', 'asc'],
                ['sort_date', 'desc'],
                ['sort_group', 'asc'],
                ['sort_name', 'asc'],
            ])
            ->values()
            ->map(function (array $row): array {
                unset($row['sort_medal'], $row['sort_date'], $row['sort_group'], $row['sort_name']);

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

    private function mapRow(object $row, string $locale): array
    {
        $tierLabel = $locale === 'en'
            ? ($row->tier_label_en ?? $row->tier_label_hi)
            : ($row->tier_label_hi ?? $row->tier_label_en);

        return [
            'id' => (int) $row->achievement_id,
            'sort_medal' => $this->medalSort($row->medal_type),
            'sort_date' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : '',
            'sort_group' => $row->event_type === 'team'
                ? sprintf('team:%s:%s:%s', $row->event_id, $row->medal_type, $row->position ?? '')
                : sprintf('individual:%s', $row->achievement_id),
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
                'designation' => $row->designation,
                'gender' => $row->gender,
                'player_category' => $row->player_category,
                'player_level' => $row->player_level,
                'current_status' => $row->current_status,
                'current_unit_id' => $row->current_unit_id,
                'posting_district_id' => $row->posting_district_id,
                'unit_name' => $row->unit_name,
                'team_name' => $row->team_name,
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
                'event_type' => $row->event_type,
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
    }

    private function expandedLineupRows(object $row, Collection $lineupMembers): array
    {
        return collect(MedalMemberScope::lineupMemberIds($row->lineup_member_ids))
            ->map(fn (int $memberId): ?object => $lineupMembers->get($memberId))
            ->filter()
            ->map(function (object $member) use ($row): object {
                $copy = clone $row;
                $copy->member_id = $member->id;
                $copy->member_code = $member->member_code;
                $copy->pno = $member->pno;
                $copy->full_name = $member->full_name;
                $copy->rank = $member->rank;
                $copy->designation = $member->designation;
                $copy->gender = $member->gender;
                $copy->player_category = $member->player_category;
                $copy->player_level = $member->player_level;
                $copy->current_status = $member->current_status;
                $copy->current_unit_id = $member->current_unit_id;
                $copy->posting_district_id = $member->posting_district_id;
                $copy->unit_name = $member->unit_name;

                return $copy;
            })
            ->values()
            ->all();
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
