<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Support\Reports\MedalMemberScope;
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
            ->leftJoin('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'tt.id',
                'tt.code',
                'tt.label_hi',
                'tt.label_en',
                'tt.weight',
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
            ->where(fn ($query) => $query->whereNull('p.member_id')->orWhereNull('m.deleted_at'));

        $rows = MedalsFilters::apply($query, MedalMemberScope::withoutMemberScopedFilters($filters))->get();
        $lineupMembers = MedalMemberScope::lineupMembers($rows);

        return $rows
            ->filter(fn (object $row): bool => MedalMemberScope::rowMatches($row, $lineupMembers, $filters))
            ->unique(fn (object $row): string => $row->event_type === 'team'
                ? 'team:'.$row->event_id.':'.$row->medal_type
                : 'achievement:'.$row->achievement_id)
            ->groupBy(fn (object $row): string => (string) ($row->code ?? 'OTHER'))
            ->map(function (Collection $tierRows): array {
                $first = $tierRows->first();
                $isDisplayOnly = ($first->code ?? 'OTHER') === 'OTHER';
                $counts = self::BLANK;

                if (! $isDisplayOnly) {
                    foreach ($tierRows as $row) {
                        if (isset($counts[$row->medal_type])) {
                            $counts[$row->medal_type]++;
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
                    'display_only' => $isDisplayOnly ? $tierRows->count() : 0,
                ] + $counts;
            })
            ->sortByDesc('tier.weight')
            ->values();
    }

    /**
     * Run a team-event medal-tally query by tier.
     *
     * `OTHER` tier medals stay visible through display_only but are excluded
     * from medal columns and total/rank calculations.
     *
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array{tier: array{code: string, label: string, weight: int}, GOLD: int, SILVER: int, BRONZE: int, MERIT: int, display_only: int}>
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

        $query = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->leftJoin('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'tt.id',
                'tt.code',
                'tt.label_hi',
                'tt.label_en',
                'tt.weight',
                'e.id as event_id',
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
                'a.medal_type',
                'p.lineup_member_ids',
                DB::raw("COALESCE(tt.code, 'OTHER') as tier_code"),
            ])
            ->where('t.organization_id', $orgId)
            ->where('e.event_type', 'team')
            ->whereNull('t.deleted_at')
            ->where(fn ($query) => $query->whereNull('p.member_id')->orWhereNull('m.deleted_at'));

        $liveRows = MedalsFilters::apply($query, MedalMemberScope::withoutMemberScopedFilters($filters))->get();
        $lineupMembers = MedalMemberScope::lineupMembers($liveRows);
        $liveRows = $liveRows->filter(fn (object $row): bool => MedalMemberScope::rowMatches($row, $lineupMembers, $filters));

        $medalUnits = $liveRows
            ->unique(fn (object $row): string => $row->event_id.':'.$row->medal_type)
            ->groupBy(fn (object $row): string => (string) ($row->code ?? 'OTHER'))
            ->map(function (Collection $rows): array {
                $first = $rows->first();
                $isDisplayOnly = ($first->code ?? 'OTHER') === 'OTHER';
                $counts = self::BLANK;

                if (! $isDisplayOnly) {
                    foreach ($rows as $row) {
                        if (isset($counts[$row->medal_type])) {
                            $counts[$row->medal_type]++;
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
                    'display_only' => $isDisplayOnly ? $rows->count() : 0,
                ] + $counts;
            });

        return $medalUnits
            ->sortByDesc('tier.weight')
            ->values();
    }
}
