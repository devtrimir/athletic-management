<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Tournament;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class TournamentScoringFinished implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Tournament $tournament,
        public readonly int $resultsScored,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('organization.'.$this->tournament->organization_id);
    }

    public function broadcastAs(): string
    {
        return 'TournamentScoringFinished';
    }

    /**
     * @return array{tournament_id: int, name: string, results_scored: int}
     */
    public function broadcastWith(): array
    {
        return [
            'tournament_id' => $this->tournament->id,
            'name' => $this->tournament->name,
            'results_scored' => $this->resultsScored,
        ];
    }
}
