<?php

declare(strict_types=1);

namespace App\Services\Performance;

use App\Models\SportSession;
use Illuminate\Support\Collection;

class MemberPerformanceService
{
    public function __construct(
        private readonly PlayerPointsService $playerPoints,
    ) {}

    /**
     * @return array{
     *     summary: array{
     *         overall_points: int,
     *         current_session_points: int,
     *         overall_rank: int|null,
     *         current_session_rank: int|null,
     *         participation_count: int,
     *         achievement_count: int,
     *         award_count: int,
     *         medals: array{GOLD: int, SILVER: int, BRONZE: int, MERIT: int},
     *         current_session: array{id: int, name: string}|null
     *     },
     *     sessions: array<int, array<string, mixed>>,
     *     ledger: array<int, array<string, mixed>>
     * }
     */
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
     */
    public function run(int $orgId, int $memberId, array $filters = []): array
    {
        $overall = $this->playerPoints->run($orgId, [...$filters, 'member_id' => $memberId]);
        /** @var Collection<int, array<string, mixed>> $overallRanking */
        $overallRanking = $this->playerPoints->run($orgId, $filters)['by_member'];

        $currentSession = SportSession::query()
            ->withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('is_current', true)
            ->first(['id', 'name']);

        $currentSummary = [
            'points' => 0,
            'participation_count' => 0,
            'achievement_count' => 0,
            'award_count' => 0,
            'medals' => $this->emptyMedals(),
        ];

        /** @var Collection<int, array<string, mixed>> $currentRanking */
        $currentRanking = collect();

        if ($currentSession !== null) {
            $current = $this->playerPoints->run($orgId, [
                ...$filters,
                'member_id' => $memberId,
                'session_id' => $currentSession->id,
            ]);

            /** @var array<string, mixed> $summary */
            $summary = $current['totals'];
            $currentSummary = $summary;
            /** @var Collection<int, array<string, mixed>> $ranking */
            $ranking = $this->playerPoints->run($orgId, [...$filters, 'session_id' => $currentSession->id])['by_member'];
            $currentRanking = $ranking;
        }

        /** @var Collection<int, array<string, mixed>> $sessions */
        $sessions = collect($overall['by_session']);
        /** @var Collection<int, array<string, mixed>> $ledger */
        $ledger = collect($overall['rows']);

        return [
            'summary' => [
                'overall_points' => (int) data_get($overall, 'totals.points', 0),
                'current_session_points' => (int) data_get($currentSummary, 'points', 0),
                'overall_rank' => $this->rankForMember($overallRanking, $memberId),
                'current_session_rank' => $this->rankForMember($currentRanking, $memberId),
                'participation_count' => (int) data_get($overall, 'totals.participation_count', 0),
                'achievement_count' => (int) data_get($overall, 'totals.achievement_count', 0),
                'award_count' => (int) data_get($overall, 'totals.award_count', 0),
                'medals' => data_get($overall, 'totals.medals', $this->emptyMedals()),
                'current_session' => $currentSession !== null ? [
                    'id' => $currentSession->id,
                    'name' => $currentSession->name,
                ] : null,
            ],
            'sessions' => $sessions
                ->sortByDesc(fn (array $row): int => (int) data_get($row, 'session.id', 0))
                ->values()
                ->map(fn (array $row): array => [
                    'session' => $row['session'],
                    'points' => (int) $row['points'],
                    'participation_count' => (int) $row['participation_count'],
                    'achievement_count' => (int) $row['achievement_count'],
                    'award_count' => (int) $row['award_count'],
                    'medals' => $row['medals'],
                ])
                ->all(),
            'ledger' => $ledger
                ->map(fn (array $row): array => [
                    'participation_id' => (int) $row['participation_id'],
                    'session' => $row['session'],
                    'sport' => $row['sport'],
                    'tournament' => $row['tournament'],
                    'event' => $row['event'],
                    'achievement' => $row['achievement'],
                    'awards' => collect($row['awards'])
                        ->map(fn (array $award): array => [
                            'id' => (int) $award['id'],
                            'award_type' => $award['award_type'],
                            'title' => $award['title'],
                            'points' => (int) $award['points'],
                        ])
                        ->all(),
                    'scoring' => [
                        'participation_points' => (int) data_get($row, 'scoring.participation_points', 0),
                        'medal_points' => (int) data_get($row, 'scoring.medal_points', 0),
                        'tier_bonus_points' => (int) data_get($row, 'scoring.tier_bonus_points', 0),
                        'award_points' => (int) data_get($row, 'scoring.award_points', 0),
                        'total_points' => (int) data_get($row, 'scoring.total_points', 0),
                    ],
                ])
                ->all(),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $ranking
     */
    private function rankForMember(Collection $ranking, int $memberId): ?int
    {
        $index = $ranking->search(
            fn (array $row): bool => (int) data_get($row, 'member.id', 0) === $memberId
        );

        return $index === false ? null : $index + 1;
    }

    /**
     * @return array{GOLD: int, SILVER: int, BRONZE: int, MERIT: int}
     */
    private function emptyMedals(): array
    {
        return [
            'GOLD' => 0,
            'SILVER' => 0,
            'BRONZE' => 0,
            'MERIT' => 0,
        ];
    }
}
