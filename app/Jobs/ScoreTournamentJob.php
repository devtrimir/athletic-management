<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Points\ScoreTournament;
use App\Events\TournamentScoringFinished;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Tournament;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Rescores one tournament in the background and tells the organisation's open pages when done.
 * Unique until it starts, so many saves of the same tournament queue only one pending run, while
 * a change made during a run still queues a fresh one.
 */
class ScoreTournamentJob implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $timeout = 600;

    /** @var list<int> */
    public array $backoff = [5, 30, 120];

    public int $uniqueFor = 900;

    public function __construct(public readonly int $tournamentId) {}

    public function uniqueId(): string
    {
        return (string) $this->tournamentId;
    }

    public function handle(ScoreTournament $score): void
    {
        $tournament = Tournament::withoutGlobalScope(BelongsToOrganization::class)->find($this->tournamentId);

        if ($tournament === null) {
            return;
        }

        $scored = $score($tournament);

        try {
            broadcast(new TournamentScoringFinished($tournament, $scored));
        } catch (Throwable $exception) {
            Log::warning('Tournament scoring broadcast failed', ['tournament_id' => $this->tournamentId, 'error' => $exception->getMessage()]);
        }
    }
}
