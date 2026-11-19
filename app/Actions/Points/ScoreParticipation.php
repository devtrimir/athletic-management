<?php

declare(strict_types=1);

namespace App\Actions\Points;

use App\Models\Competition;
use App\Models\Participation;
use App\Models\ParticipationScore;
use App\Models\PointScheme;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;

/**
 * Stores a player's points for a participation (team events have one participation per player, so everyone gets full points) under the version in force
 * on the tournament's date. Re-running replaces the stored rows, so it also
 * serves as the "reprocess" after a game level is chosen or a medal changes.
 * Tournaments without a game level (or competition) score nothing yet.
 */
class ScoreParticipation
{
    /** Merit has no row on the sheet, so it is scored as participation. */
    private const RESULT_BY_MEDAL = ['GOLD' => 'GOLD', 'SILVER' => 'SILVER', 'BRONZE' => 'BRONZE'];

    public function __invoke(Participation $participation): void
    {
        $participation->loadMissing('event', 'achievement');
        $tournament = Tournament::withoutGlobalScopes()->find($participation->event->tournament_id);

        $stale = ParticipationScore::where('participation_id', $participation->id);
        $level = $tournament?->game_level_id ?? ($tournament?->competition_id === null ? null
            : Competition::withoutGlobalScopes()->whereKey($tournament->competition_id)->value('game_level_id'));

        if ($tournament === null || $level === null) {
            $stale->delete();

            return;
        }

        $date = $tournament->date_from ?? $participation->created_at;
        $scheme = PointScheme::withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $tournament->organization_id)->inForceOn($date)->first();

        if ($scheme === null) {
            $stale->delete();

            return;
        }

        $result = self::RESULT_BY_MEDAL[$participation->achievement?->medal_type] ?? 'PARTICIPATION';
        $points = $scheme->rows()->where('game_level_id', $level)->where('result', $result)->value('points');

        if ($points === null) {
            $stale->delete();

            return;
        }

        ParticipationScore::updateOrCreate(
            ['participation_id' => $participation->id, 'member_id' => $participation->member_id],
            [
                'organization_id' => $tournament->organization_id,
                'point_scheme_id' => $scheme->id,
                'game_level_id' => $level,
                'result' => $result,
                'points' => $points,
                'scored_on' => $date,
            ],
        );
    }
}
