<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalMemberScope;
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
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'a.medal_type',
                'p.lineup_member_ids',
                'm.id',
                'm.member_code',
                'm.full_name',
                'm.pno',
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
            ->where(fn ($query) => $query->whereNull('p.member_id')->orWhereNull('m.deleted_at'));

        $rows = MedalsFilters::apply($query, MedalMemberScope::withoutMemberScopedFilters($filters))->get();
        $lineupMembers = MedalMemberScope::lineupMembers($rows);

        return $rows
            ->flatMap(fn (object $row): array => $this->memberMedalRows($row, $lineupMembers))
            ->filter(fn (array $row): bool => MedalMemberScope::memberMatchesFilters($row, $filters))
            ->groupBy('id')
            ->map(function (Collection $memberRows): array {
                $first = $memberRows->first();
                $counts = array_fill_keys(self::MEDAL_TYPES, 0);

                foreach ($memberRows as $memberRow) {
                    if (isset($counts[$memberRow['medal_type']])) {
                        $counts[$memberRow['medal_type']]++;
                    }
                }

                return [
                    'member' => [
                        'id' => $first['id'],
                        'member_code' => $first['member_code'],
                        'full_name' => $first['full_name'],
                    ],
                    'GOLD' => $counts['GOLD'],
                    'SILVER' => $counts['SILVER'],
                    'BRONZE' => $counts['BRONZE'],
                    'MERIT' => $counts['MERIT'],
                    'total' => array_sum($counts),
                ];
            })
            ->sortBy([
                ['total', 'desc'],
                ['GOLD', 'desc'],
                ['SILVER', 'desc'],
                ['BRONZE', 'desc'],
            ])
            ->take($limit)
            ->values();
    }

    private function memberMedalRows(object $row, Collection $lineupMembers): array
    {
        if ($row->id !== null) {
            return [[
                'id' => $row->id,
                'member_code' => $row->member_code,
                'full_name' => $row->full_name,
                'pno' => $row->pno,
                'rank' => $row->rank,
                'designation' => $row->designation,
                'gender' => $row->gender,
                'player_category' => $row->player_category,
                'player_level' => $row->player_level,
                'current_status' => $row->current_status,
                'current_unit_id' => $row->current_unit_id,
                'posting_district_id' => $row->posting_district_id,
                'medal_type' => $row->medal_type,
            ]];
        }

        return collect(MedalMemberScope::lineupMemberIds($row->lineup_member_ids))
            ->map(fn (int $memberId): ?object => $lineupMembers->get($memberId))
            ->filter()
            ->map(fn (object $member): array => [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'pno' => $member->pno,
                'rank' => $member->rank,
                'designation' => $member->designation,
                'gender' => $member->gender,
                'player_category' => $member->player_category,
                'player_level' => $member->player_level,
                'current_status' => $member->current_status,
                'current_unit_id' => $member->current_unit_id,
                'posting_district_id' => $member->posting_district_id,
                'medal_type' => $row->medal_type,
            ])
            ->values()
            ->all();
    }
}
