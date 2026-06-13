<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Services\Performance\PlayerPointsService;
use Illuminate\Support\Collection;

class PlayerPerformanceReport
{
    public function __construct(
        private readonly PlayerPointsService $playerPoints,
    ) {}

    /**
     * @param  array{
     *     session_id?: int|null,
     *     sport_id?: int|null,
     *     unit_id?: int|null,
     *     tier_id?: int|null,
     *     member_name?: string|null,
     *     pno?: string|null,
     *     from_date?: string|null,
     *     to_date?: string|null
     * }  $filters
     * @return Collection<int, array{
     *     rank: int,
     *     member: array{id: int|null, member_code: string|null, pno: string|null, full_name_hi: string|null, full_name_en: string|null},
     *     unit: array{id: int, name_hi: string, name_en: string}|null,
     *     participation_count: int,
     *     achievement_count: int,
     *     award_count: int,
     *     GOLD: int,
     *     SILVER: int,
     *     BRONZE: int,
     *     MERIT: int,
     *     total_points: int
     * }>
     */
    public function run(int $orgId, array $filters, int $limit = 50): Collection
    {
        /** @var Collection<int, array<string, mixed>> $members */
        $members = $this->playerPoints->run($orgId, $filters)['by_member'];

        return $members
            ->take($limit)
            ->values()
            ->map(fn (array $row, int $index): array => [
                'rank' => $index + 1,
                'member' => $row['member'],
                'unit' => $row['member']['unit'],
                'participation_count' => (int) $row['participation_count'],
                'achievement_count' => (int) $row['achievement_count'],
                'award_count' => (int) $row['award_count'],
                'GOLD' => (int) $row['medals']['GOLD'],
                'SILVER' => (int) $row['medals']['SILVER'],
                'BRONZE' => (int) $row['medals']['BRONZE'],
                'MERIT' => (int) $row['medals']['MERIT'],
                'total_points' => (int) $row['points'],
            ]);
    }
}
