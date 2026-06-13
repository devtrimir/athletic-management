<?php

declare(strict_types=1);

namespace App\Services\Performance;

use App\Models\Participation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PlayerPointsService
{
    /**
     * Build an audited scoring view over participations, achievements, and awards.
     *
     * @param  array{
     *      member_id?: int|null,
     *      member_ids?: array<int>|null,
     *      session_id?: int|null,
     *      session_ids?: array<int>|null,
     *      sport_id?: int|null,
     *      sport_ids?: array<int>|null,
     *      unit_id?: int|null,
     *      unit_ids?: array<int>|null,
     *      district_ids?: array<int>|null,
     *      tier_id?: int|null,
     *      tier_ids?: array<int>|null,
     *      member_name?: string|null,
     *      pno?: string|null,
     *      from_date?: string|null,
     *      to_date?: string|null
     * }  $filters
     * @return array{
     *     rows: Collection<int, array<string, mixed>>,
     *     totals: array<string, mixed>,
     *     by_member: Collection<int, array<string, mixed>>,
     *     by_session: Collection<int, array<string, mixed>>,
     *     by_sport: Collection<int, array<string, mixed>>,
     *     by_tier: Collection<int, array<string, mixed>>
     * }
     */
    public function run(int $orgId, array $filters = []): array
    {
        $rows = $this->participationQuery($orgId, $filters)
            ->get()
            ->map(fn (Participation $participation): array => $this->rowForParticipation($participation));

        return [
            'rows' => $rows->values(),
            'totals' => $this->summaryForRows($rows),
            'by_member' => $this->summariesByMember($rows),
            'by_session' => $this->summariesBySession($rows),
            'by_sport' => $this->summariesBySport($rows),
            'by_tier' => $this->summariesByTier($rows),
        ];
    }

    /**
     * @param  array{
     *      member_id?: int|null,
     *      member_ids?: array<int>|null,
     *      session_id?: int|null,
     *      session_ids?: array<int>|null,
     *      sport_id?: int|null,
     *      sport_ids?: array<int>|null,
     *      unit_id?: int|null,
     *      unit_ids?: array<int>|null,
     *      district_ids?: array<int>|null,
     *      tier_id?: int|null,
     *      tier_ids?: array<int>|null,
     *      member_name?: string|null,
     *      pno?: string|null,
     *      from_date?: string|null,
     *      to_date?: string|null
     * }  $filters
     * @return Builder<Participation>
     */
    private function participationQuery(int $orgId, array $filters): Builder
    {
        $memberId = $filters['member_id'] ?? null;
        /** @var array<int> $memberIds */
        $memberIds = array_values(array_filter($filters['member_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        $sessionId = $filters['session_id'] ?? null;
        /** @var array<int> $sessionIds */
        $sessionIds = array_values(array_filter($filters['session_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        $sportId = $filters['sport_id'] ?? null;
        /** @var array<int> $sportIds */
        $sportIds = array_values(array_filter($filters['sport_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        $unitId = $filters['unit_id'] ?? null;
        /** @var array<int> $unitIds */
        $unitIds = array_values(array_filter($filters['unit_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        /** @var array<int> $districtIds */
        $districtIds = array_values(array_filter($filters['district_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        $tierId = $filters['tier_id'] ?? null;
        /** @var array<int> $tierIds */
        $tierIds = array_values(array_filter($filters['tier_ids'] ?? [], static fn ($value): bool => is_int($value) || ctype_digit((string) $value)));
        $memberName = $filters['member_name'] ?? null;
        $pno = $filters['pno'] ?? null;
        $fromDate = $filters['from_date'] ?? null;
        $toDate = $filters['to_date'] ?? null;

        return Participation::query()
            ->with([
                'member' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select([
                        'id',
                        'organization_id',
                        'member_code',
                        'pno',
                        'full_name_hi',
                        'full_name_en',
                        'rank',
                        'posting_district_id',
                        'current_unit_id',
                    ]),
                'member.postingDistrict' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'name_hi', 'name_en']),
                'member.currentUnit' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'organization_id', 'name_hi', 'name_en', 'district_id']),
                'member.currentUnit.district' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'name_hi', 'name_en']),
                'session' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'organization_id', 'name']),
                'event' => fn ($query) => $query
                    ->select(['id', 'tournament_id', 'sport_id', 'name_hi']),
                'event.sport' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'organization_id', 'name_hi', 'name_en']),
                'event.tournament' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select([
                        'id',
                        'organization_id',
                        'session_id',
                        'tier_id',
                        'sport_id',
                        'name_hi',
                        'date_from',
                        'deleted_at',
                    ]),
                'event.tournament.tier' => fn ($query) => $query
                    ->select(['id', 'code', 'label_hi', 'label_en', 'weight']),
                'achievement' => fn ($query) => $query
                    ->select([
                        'id',
                        'participation_id',
                        'medal_type',
                        'position',
                        'remarks',
                    ]),
                'participationAwards' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select([
                        'id',
                        'organization_id',
                        'participation_id',
                        'award_type',
                        'title',
                        'points_override',
                        'remarks',
                    ]),
            ])
            ->whereHas('member', fn ($query) => $query
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at'))
            ->whereHas('event.tournament', fn ($query) => $query
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at'))
            ->when($memberId, fn (Builder $query) => $query->where('member_id', $memberId))
            ->when($memberIds !== [], fn (Builder $query) => $query->whereIn('member_id', $memberIds))
            ->when($sessionId, fn (Builder $query) => $query->where('session_id', $sessionId))
            ->when($sessionIds !== [], fn (Builder $query) => $query->whereIn('session_id', $sessionIds))
            ->when($sportId, fn (Builder $query) => $query->whereHas('event', fn ($eventQuery) => $eventQuery->where('sport_id', $sportId)))
            ->when($sportIds !== [], fn (Builder $query) => $query->whereHas('event', fn ($eventQuery) => $eventQuery->whereIn('sport_id', $sportIds)))
            ->when($unitId, fn (Builder $query) => $query->whereHas('member', fn ($memberQuery) => $memberQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('current_unit_id', $unitId)
                ->whereNull('deleted_at')))
            ->when($unitIds !== [], fn (Builder $query) => $query->whereHas('member', fn ($memberQuery) => $memberQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereIn('current_unit_id', $unitIds)
                ->whereNull('deleted_at')))
            ->when($districtIds !== [], fn (Builder $query) => $query->whereHas('member', function ($memberQuery) use ($districtIds, $orgId): void {
                $memberQuery
                    ->withoutGlobalScopes()
                    ->where('organization_id', $orgId)
                    ->whereNull('deleted_at')
                    ->where(function ($districtQuery) use ($districtIds): void {
                        $districtQuery
                            ->whereIn('posting_district_id', $districtIds)
                            ->orWhereHas('currentUnit', fn ($unitQuery) => $unitQuery->whereIn('district_id', $districtIds));
                    });
            }))
            ->when(is_string($memberName) && $memberName !== '', fn (Builder $query) => $query->whereHas('member', fn ($memberQuery) => $memberQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->where(function ($nameQuery) use ($memberName): void {
                    $nameQuery
                        ->where('full_name_hi', 'like', "%{$memberName}%")
                        ->orWhere('full_name_en', 'like', "%{$memberName}%");
                })))
            ->when(is_string($pno) && $pno !== '', fn (Builder $query) => $query->whereHas('member', fn ($memberQuery) => $memberQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->where('pno', 'like', "%{$pno}%")))
            ->when($tierId, fn (Builder $query) => $query->whereHas('event.tournament', fn ($tournamentQuery) => $tournamentQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('tier_id', $tierId)
                ->whereNull('deleted_at')))
            ->when($tierIds !== [], fn (Builder $query) => $query->whereHas('event.tournament', fn ($tournamentQuery) => $tournamentQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereIn('tier_id', $tierIds)
                ->whereNull('deleted_at')))
            ->when(is_string($fromDate) && $fromDate !== '', fn (Builder $query) => $query->whereHas('event.tournament', fn ($tournamentQuery) => $tournamentQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereDate('date_from', '>=', $fromDate)
                ->whereNull('deleted_at')))
            ->when(is_string($toDate) && $toDate !== '', fn (Builder $query) => $query->whereHas('event.tournament', fn ($tournamentQuery) => $tournamentQuery
                ->withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->whereDate('date_from', '<=', $toDate)
                ->whereNull('deleted_at')))
            ->orderByDesc('session_id')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function rowForParticipation(Participation $participation): array
    {
        $member = $participation->member;
        $event = $participation->event;
        $tournament = $event?->tournament;
        $tier = $tournament?->tier;
        $sport = $event?->sport;
        $achievement = $participation->achievement;
        $district = $member?->postingDistrict ?? $member?->currentUnit?->district;

        $awards = $participation->participationAwards
            ->map(fn ($award): array => [
                'id' => $award->id,
                'award_type' => $award->award_type,
                'title' => $award->title,
                'points_override' => $award->points_override,
                'remarks' => $award->remarks,
                'points' => $award->points_override ?? $this->awardPoints($award->award_type),
            ])
            ->values();

        $participationPoints = $this->participationBasePoints();
        $medalPoints = $achievement?->medal_type !== null
            ? $this->medalPoints($achievement->medal_type)
            : 0;
        $tierBonusPoints = $achievement?->medal_type !== null && $tier?->code !== null
            ? $this->tierBonusPoints($tier->code)
            : 0;
        $awardPoints = $awards->sum('points');

        return [
            'participation_id' => $participation->id,
            'member' => [
                'id' => $member?->id,
                'member_code' => $member?->member_code,
                'pno' => $member?->pno,
                'full_name_hi' => $member?->full_name_hi,
                'full_name_en' => $member?->full_name_en,
                'rank' => $member?->rank,
                'district' => $district ? [
                    'id' => $district->id,
                    'name_hi' => $district->name_hi,
                    'name_en' => $district->name_en,
                ] : null,
                'unit' => $member?->currentUnit ? [
                    'id' => $member->currentUnit->id,
                    'name_hi' => $member->currentUnit->name_hi,
                    'name_en' => $member->currentUnit->name_en,
                ] : null,
            ],
            'session' => [
                'id' => $participation->session?->id,
                'name' => $participation->session?->name,
            ],
            'sport' => $sport ? [
                'id' => $sport->id,
                'name_hi' => $sport->name_hi,
                'name_en' => $sport->name_en,
            ] : null,
            'tournament' => $tournament ? [
                'id' => $tournament->id,
                'name_hi' => $tournament->name_hi,
                'date_from' => $tournament->date_from?->toDateString(),
                'tier' => $tier ? [
                    'id' => $tier->id,
                    'code' => $tier->code,
                    'label_hi' => $tier->label_hi,
                    'label_en' => $tier->label_en,
                    'weight' => $tier->weight,
                ] : null,
            ] : null,
            'event' => $event ? [
                'id' => $event->id,
                'name_hi' => $event->name_hi,
            ] : null,
            'achievement' => $achievement ? [
                'id' => $achievement->id,
                'medal_type' => $achievement->medal_type,
                'position' => $achievement->position,
                'remarks' => $achievement->remarks,
            ] : null,
            'awards' => $awards->all(),
            'scoring' => [
                'participation_points' => $participationPoints,
                'medal_points' => $medalPoints,
                'tier_bonus_points' => $tierBonusPoints,
                'award_points' => $awardPoints,
                'total_points' => $participationPoints + $medalPoints + $tierBonusPoints + $awardPoints,
            ],
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function summaryForRows(Collection $rows): array
    {
        return [
            'points' => (int) $rows->sum('scoring.total_points'),
            'participation_count' => $rows->count(),
            'achievement_count' => $rows->filter(fn (array $row): bool => $row['achievement'] !== null)->count(),
            'award_count' => (int) $rows->sum(fn (array $row): int => count($row['awards'])),
            'medals' => $this->medalCountsForRows($rows),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function summariesByMember(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (array $row): string => (string) ($row['member']['id'] ?? '0'))
            ->map(function (Collection $group): array {
                $first = $group->first();

                return [
                    'member' => $first['member'],
                    'points' => (int) $group->sum('scoring.total_points'),
                    'participation_count' => $group->count(),
                    'achievement_count' => $group->filter(fn (array $row): bool => $row['achievement'] !== null)->count(),
                    'award_count' => (int) $group->sum(fn (array $row): int => count($row['awards'])),
                    'medals' => $this->medalCountsForRows($group),
                ];
            })
            ->sortBy([
                ['points', 'desc'],
                ['medals.GOLD', 'desc'],
                ['medals.SILVER', 'desc'],
                ['medals.BRONZE', 'desc'],
                ['member.full_name_hi', 'asc'],
            ])
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function summariesBySession(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (array $row): string => (string) ($row['session']['id'] ?? '0'))
            ->map(function (Collection $group): array {
                $first = $group->first();

                return [
                    'session' => $first['session'],
                    'points' => (int) $group->sum('scoring.total_points'),
                    'participation_count' => $group->count(),
                    'achievement_count' => $group->filter(fn (array $row): bool => $row['achievement'] !== null)->count(),
                    'award_count' => (int) $group->sum(fn (array $row): int => count($row['awards'])),
                    'medals' => $this->medalCountsForRows($group),
                ];
            })
            ->sortByDesc('points')
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function summariesBySport(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (array $row): string => (string) data_get($row, 'sport.id', 0))
            ->map(function (Collection $group): array {
                $first = $group->first();

                return [
                    'sport' => $first['sport'],
                    'points' => (int) $group->sum('scoring.total_points'),
                    'participation_count' => $group->count(),
                    'achievement_count' => $group->filter(fn (array $row): bool => $row['achievement'] !== null)->count(),
                    'award_count' => (int) $group->sum(fn (array $row): int => count($row['awards'])),
                    'medals' => $this->medalCountsForRows($group),
                ];
            })
            ->sortByDesc('points')
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function summariesByTier(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (array $row): string => (string) data_get($row, 'tournament.tier.id', 0))
            ->map(function (Collection $group): array {
                $first = $group->first();

                return [
                    'tier' => data_get($first, 'tournament.tier'),
                    'points' => (int) $group->sum('scoring.total_points'),
                    'participation_count' => $group->count(),
                    'achievement_count' => $group->filter(fn (array $row): bool => $row['achievement'] !== null)->count(),
                    'award_count' => (int) $group->sum(fn (array $row): int => count($row['awards'])),
                    'medals' => $this->medalCountsForRows($group),
                ];
            })
            ->sortByDesc('points')
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{GOLD: int, SILVER: int, BRONZE: int, MERIT: int}
     */
    private function medalCountsForRows(Collection $rows): array
    {
        $counts = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        foreach ($rows as $row) {
            $medalType = data_get($row, 'achievement.medal_type');

            if (is_string($medalType) && array_key_exists($medalType, $counts)) {
                $counts[$medalType]++;
            }
        }

        return $counts;
    }

    private function participationBasePoints(): int
    {
        return (int) config('player_points.participation.base_points', 0);
    }

    private function medalPoints(string $medalType): int
    {
        return (int) config("player_points.medals.{$medalType}", 0);
    }

    private function tierBonusPoints(string $tierCode): int
    {
        return (int) config("player_points.tier_bonus.{$tierCode}", 0);
    }

    private function awardPoints(string $awardType): int
    {
        return (int) config("player_points.awards.{$awardType}", 0);
    }
}
