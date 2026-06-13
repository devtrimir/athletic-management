<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Services\Performance\PlayerPointsService;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class PlayerPerformanceReportPage
{
    private const GROUPABLE_DIMENSIONS = [
        'overall',
        'session',
        'sport',
        'tier',
        'district',
        'unit',
        'member',
    ];

    public function __construct(
        private readonly PlayerPointsService $playerPoints,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *     summary: array<string, mixed>,
     *     groups: array<int, array<string, mixed>>,
     *     group_by: string,
     *     subgroup_by: string|null,
     *     ranking_scope: string,
     *     pagination: array<string, mixed>
     * }
     */
    public function run(int $orgId, array $filters): array
    {
        /** @var Collection<int, array<string, mixed>> $rows */
        $rows = $this->playerPoints->run($orgId, $filters)['rows'];
        $groupBy = $this->normalizeDimension($filters['group_by'] ?? 'overall');
        $subgroupBy = $this->normalizeSubgroupDimension(
            $filters['subgroup_by'] ?? null,
            $groupBy,
        );
        $rankingScope = ($filters['ranking_scope'] ?? 'within_group') === 'overall'
            ? 'overall'
            : 'within_group';
        $perPage = max(1, (int) ($filters['limit'] ?? 50));
        $page = max(1, (int) ($filters['page'] ?? 1));
        $fullGroups = $this->buildGroups($rows, $groupBy, $subgroupBy, $rankingScope);
        $leafRows = collect($this->flattenLeafRows($fullGroups));
        $paginator = new LengthAwarePaginator(
            $leafRows->forPage($page, $perPage)->values()->all(),
            $leafRows->count(),
            $perPage,
            $page,
            [
                'path' => LengthAwarePaginator::resolveCurrentPath(),
                'pageName' => 'page',
                'query' => array_filter($filters, static fn (mixed $value): bool => $value !== null && $value !== '' && $value !== []),
            ],
        );

        return [
            'summary' => $this->summaryForRows($rows),
            'groups' => $this->groupsForPage($fullGroups, collect($paginator->items())),
            'group_by' => $groupBy,
            'subgroup_by' => $subgroupBy,
            'ranking_scope' => $rankingScope,
            'pagination' => [
                'links' => $paginator->linkCollection()->toArray(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'per_page' => $paginator->perPage(),
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $groups
     * @return array<int, array<string, mixed>>
     */
    private function groupsForPage(array $groups, Collection $pageItems): array
    {
        $allowedKeys = $pageItems
            ->map(fn (array $item): string => $item['leaf_key'])
            ->all();

        return collect($groups)
            ->map(function (array $group) use ($allowedKeys): ?array {
                $groupKey = (string) $group['key'];

                if (($group['subgroups'] ?? []) !== []) {
                    $subgroups = collect($group['subgroups'])
                        ->map(function (array $subgroup) use ($allowedKeys, $groupKey): ?array {
                            $subgroupKey = (string) $subgroup['key'];
                            $rows = collect($subgroup['rows'] ?? [])
                                ->filter(fn (array $row): bool => in_array(
                                    "{$groupKey}:{$subgroupKey}:".data_get($row, 'member.id'),
                                    $allowedKeys,
                                    true,
                                ))
                                ->values()
                                ->all();

                            if ($rows === []) {
                                return null;
                            }

                            return [
                                ...$subgroup,
                                'rows' => $rows,
                            ];
                        })
                        ->filter()
                        ->values()
                        ->all();

                    if ($subgroups === []) {
                        return null;
                    }

                    return [
                        ...$group,
                        'rows' => [],
                        'subgroups' => $subgroups,
                    ];
                }

                $rows = collect($group['rows'] ?? [])
                    ->filter(fn (array $row): bool => in_array(
                        "{$groupKey}:".data_get($row, 'member.id'),
                        $allowedKeys,
                        true,
                    ))
                    ->values()
                    ->all();

                if ($rows === []) {
                    return null;
                }

                return [
                    ...$group,
                    'rows' => $rows,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $groups
     * @return array<int, array<string, mixed>>
     */
    private function flattenLeafRows(array $groups): array
    {
        $rows = [];

        foreach ($groups as $group) {
            $groupKey = (string) $group['key'];

            if (($group['subgroups'] ?? []) !== []) {
                foreach ($group['subgroups'] as $subgroup) {
                    $subgroupKey = (string) $subgroup['key'];

                    foreach ($subgroup['rows'] ?? [] as $row) {
                        $rows[] = [
                            ...$row,
                            'leaf_key' => "{$groupKey}:{$subgroupKey}:".data_get($row, 'member.id'),
                        ];
                    }
                }

                continue;
            }

            foreach ($group['rows'] ?? [] as $row) {
                $rows[] = [
                    ...$row,
                    'leaf_key' => "{$groupKey}:".data_get($row, 'member.id'),
                ];
            }
        }

        return $rows;
    }

    private function normalizeDimension(mixed $value): string
    {
        return is_string($value) && in_array($value, self::GROUPABLE_DIMENSIONS, true)
            ? $value
            : 'overall';
    }

    private function normalizeSubgroupDimension(mixed $value, string $groupBy): ?string
    {
        if (! is_string($value) || $value === '' || $value === 'none') {
            return null;
        }

        if (! in_array($value, self::GROUPABLE_DIMENSIONS, true) || $value === $groupBy) {
            return null;
        }

        return $value;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function buildGroups(
        Collection $rows,
        string $groupBy,
        ?string $subgroupBy,
        string $rankingScope,
    ): array {
        $overallRanks = $rankingScope === 'overall'
            ? $this->rankMapForMemberSummaries($this->memberSummariesForRows($rows))
            : [];

        return $rows
            ->groupBy(fn (array $row): string => $this->dimensionMeta($row, $groupBy)['key'])
            ->map(function (Collection $groupRows) use ($groupBy, $subgroupBy, $overallRanks): array {
                /** @var array{key: string, label: string, dimension: string, dimension_id: int|string|null} $meta */
                $meta = $this->dimensionMeta($groupRows->first(), $groupBy);

                return [
                    ...$meta,
                    'summary' => $this->summaryForRows($groupRows),
                    'rows' => $subgroupBy === null
                        ? $this->rowsForLeafGroup($groupRows, $overallRanks)
                        : [],
                    'subgroups' => $subgroupBy === null
                        ? []
                        : $this->buildSubgroups($groupRows, $subgroupBy, $overallRanks),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  array<int, int>  $overallRanks
     * @return array<int, array<string, mixed>>
     */
    private function buildSubgroups(Collection $rows, string $dimension, array $overallRanks): array
    {
        return $rows
            ->groupBy(fn (array $row): string => $this->dimensionMeta($row, $dimension)['key'])
            ->map(function (Collection $subgroupRows) use ($dimension, $overallRanks): array {
                /** @var array{key: string, label: string, dimension: string, dimension_id: int|string|null} $meta */
                $meta = $this->dimensionMeta($subgroupRows->first(), $dimension);

                return [
                    ...$meta,
                    'summary' => $this->summaryForRows($subgroupRows),
                    'rows' => $this->rowsForLeafGroup($subgroupRows, $overallRanks),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  array<int, int>  $overallRanks
     * @return array<int, array<string, mixed>>
     */
    private function rowsForLeafGroup(Collection $rows, array $overallRanks): array
    {
        $memberSummaries = $this->memberSummariesForRows($rows);
        $withinGroupRanks = $this->rankMapForMemberSummaries($memberSummaries);

        return $memberSummaries
            ->map(function (array $summary) use ($overallRanks, $withinGroupRanks): array {
                $memberId = (int) data_get($summary, 'member.id', 0);

                return [
                    'rank' => $overallRanks[$memberId] ?? $withinGroupRanks[$memberId] ?? null,
                    ...$summary,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function memberSummariesForRows(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (array $row): string => (string) data_get($row, 'member.id', '0'))
            ->map(function (Collection $memberRows): array {
                /** @var array<string, mixed> $first */
                $first = $memberRows->first();
                $summary = $this->summaryForRows($memberRows);

                return [
                    'member' => data_get($first, 'member'),
                    'participation_count' => $summary['participation_count'],
                    'achievement_count' => $summary['achievement_count'],
                    'award_count' => $summary['award_count'],
                    'GOLD' => $summary['medals']['GOLD'],
                    'SILVER' => $summary['medals']['SILVER'],
                    'BRONZE' => $summary['medals']['BRONZE'],
                    'MERIT' => $summary['medals']['MERIT'],
                    'total_points' => $summary['points'],
                ];
            })
            ->sort(function (array $left, array $right): int {
                $pointsComparison = $right['total_points'] <=> $left['total_points'];

                if ($pointsComparison !== 0) {
                    return $pointsComparison;
                }

                $achievementsComparison = $right['achievement_count'] <=> $left['achievement_count'];

                if ($achievementsComparison !== 0) {
                    return $achievementsComparison;
                }

                return strcmp(
                    (string) data_get($left, 'member.full_name_hi', ''),
                    (string) data_get($right, 'member.full_name_hi', ''),
                );
            })
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $memberSummaries
     * @return array<int, int>
     */
    private function rankMapForMemberSummaries(Collection $memberSummaries): array
    {
        $ranks = [];

        foreach ($memberSummaries->values() as $index => $summary) {
            $memberId = (int) data_get($summary, 'member.id', 0);

            if ($memberId > 0) {
                $ranks[$memberId] = $index + 1;
            }
        }

        return $ranks;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{
     *     points: int,
     *     participation_count: int,
     *     achievement_count: int,
     *     award_count: int,
     *     medals: array{GOLD: int, SILVER: int, BRONZE: int, MERIT: int}
     * }
     */
    private function summaryForRows(Collection $rows): array
    {
        $medals = [
            'GOLD' => 0,
            'SILVER' => 0,
            'BRONZE' => 0,
            'MERIT' => 0,
        ];

        foreach ($rows as $row) {
            $medalType = data_get($row, 'achievement.medal_type');

            if (is_string($medalType) && array_key_exists($medalType, $medals)) {
                $medals[$medalType] += 1;
            }
        }

        return [
            'points' => (int) $rows->sum(fn (array $row): int => (int) data_get($row, 'scoring.total_points', 0)),
            'participation_count' => $rows->count(),
            'achievement_count' => $rows->filter(fn (array $row): bool => data_get($row, 'achievement') !== null)->count(),
            'award_count' => (int) $rows->sum(fn (array $row): int => count((array) data_get($row, 'awards', []))),
            'medals' => $medals,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{key: string, label: string, dimension: string, dimension_id: int|string|null}
     */
    private function dimensionMeta(array $row, string $dimension): array
    {
        return match ($dimension) {
            'session' => [
                'key' => (string) data_get($row, 'session.id', '0'),
                'label' => (string) (data_get($row, 'session.name') ?? '—'),
                'dimension' => 'session',
                'dimension_id' => data_get($row, 'session.id'),
            ],
            'sport' => [
                'key' => (string) data_get($row, 'sport.id', '0'),
                'label' => (string) (data_get($row, 'sport.name_hi') ?? '—'),
                'dimension' => 'sport',
                'dimension_id' => data_get($row, 'sport.id'),
            ],
            'tier' => [
                'key' => (string) data_get($row, 'tournament.tier.id', '0'),
                'label' => (string) (data_get($row, 'tournament.tier.label_hi') ?? '—'),
                'dimension' => 'tier',
                'dimension_id' => data_get($row, 'tournament.tier.id'),
            ],
            'district' => [
                'key' => (string) data_get($row, 'member.district.id', '0'),
                'label' => (string) (data_get($row, 'member.district.name_hi') ?? '—'),
                'dimension' => 'district',
                'dimension_id' => data_get($row, 'member.district.id'),
            ],
            'unit' => [
                'key' => (string) data_get($row, 'member.unit.id', '0'),
                'label' => (string) (data_get($row, 'member.unit.name_hi') ?? '—'),
                'dimension' => 'unit',
                'dimension_id' => data_get($row, 'member.unit.id'),
            ],
            'member' => [
                'key' => (string) data_get($row, 'member.id', '0'),
                'label' => (string) (data_get($row, 'member.full_name_hi') ?? '—'),
                'dimension' => 'member',
                'dimension_id' => data_get($row, 'member.id'),
            ],
            default => [
                'key' => 'overall',
                'label' => 'Overall',
                'dimension' => 'overall',
                'dimension_id' => null,
            ],
        };
    }
}
