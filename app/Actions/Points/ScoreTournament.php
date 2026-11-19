<?php

declare(strict_types=1);

namespace App\Actions\Points;

use App\Models\Participation;
use App\Models\Tournament;

/** Rescores every participation of a tournament, e.g. after its competition is attached. */
class ScoreTournament
{
    public function __construct(private ScoreParticipation $score) {}

    public function __invoke(Tournament $tournament): void
    {
        Participation::whereHas('event', fn ($events) => $events->where('tournament_id', $tournament->id))
            ->each(fn (Participation $participation) => ($this->score)($participation));
    }
}
