<?php

declare(strict_types=1);

namespace App\Actions\Points;

use App\Models\Competition;
use App\Models\Participation;
use App\Models\ParticipationScore;
use App\Models\PointScheme;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Illuminate\Support\Carbon;

/**
 * Rescores every participation of a tournament in bulk, e.g. after its game level is chosen.
 * The level, version and points table are looked up once, then rows are written in chunks
 * with one upsert each, so a tournament with thousands of players costs a handful of queries
 * per chunk instead of several per player.
 */
class ScoreTournament
{
    private const CHUNK = 500;

    /**
     * @return int how many results ended up with stored points
     */
    public function __invoke(Tournament $tournament): int
    {
        $level = $tournament->game_level_id ?? ($tournament->competition_id === null ? null
            : Competition::withoutGlobalScopes()->whereKey($tournament->competition_id)->value('game_level_id'));
        $participations = Participation::whereHas('event', fn ($events) => $events->where('tournament_id', $tournament->id));

        if ($level === null) {
            ParticipationScore::whereIn('participation_id', (clone $participations)->select('participations.id'))->delete();

            return 0;
        }

        /** @var array<string, array{id: int, points: array<string, int>}|null> $schemes keyed by date */
        $schemes = [];
        $scored = 0;

        $participations->with('achievement')->chunkById(self::CHUNK, function ($chunk) use ($tournament, $level, &$schemes, &$scored): void {
            $rows = [];
            $unscorable = [];
            $now = now();

            foreach ($chunk as $participation) {
                $date = ($tournament->date_from ?? $participation->created_at)->toDateString();
                $schemes[$date] ??= $this->schemeFor($tournament->organization_id, $date, $level);
                $scheme = $schemes[$date];
                $result = ScoreParticipation::RESULT_BY_MEDAL[$participation->achievement?->medal_type] ?? 'PARTICIPATION';
                $points = $scheme['points'][$result] ?? null;

                if ($scheme === null || $points === null) {
                    $unscorable[] = $participation->id;

                    continue;
                }

                $rows[] = [
                    'organization_id' => $tournament->organization_id,
                    'participation_id' => $participation->id,
                    'member_id' => $participation->member_id,
                    'point_scheme_id' => $scheme['id'],
                    'game_level_id' => $level,
                    'result' => $result,
                    'points' => $points,
                    'scored_on' => $date,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($unscorable !== []) {
                ParticipationScore::whereIn('participation_id', $unscorable)->delete();
            }

            if ($rows !== []) {
                ParticipationScore::upsert($rows, ['participation_id', 'member_id'], ['organization_id', 'point_scheme_id', 'game_level_id', 'result', 'points', 'scored_on', 'updated_at']);
                $scored += count($rows);
            }
        });

        return $scored;
    }

    /**
     * @return array{id: int, points: array<string, int>}|null
     */
    private function schemeFor(int $organizationId, string $date, int $levelId): ?array
    {
        $scheme = PointScheme::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $organizationId)->inForceOn(Carbon::parse($date))->first();

        if ($scheme === null) {
            return null;
        }

        return [
            'id' => $scheme->id,
            'points' => $scheme->rows()->where('game_level_id', $levelId)->pluck('points', 'result')->map(fn ($points) => (int) $points)->all(),
        ];
    }
}
