<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Event;
use App\Models\Member;
use App\Models\Participation;
use App\Models\SportSession;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Participation>
 */
class ParticipationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'member_id' => Member::factory(),
            'team_id' => null,
            'session_id' => SportSession::factory(),
            'position' => null,
        ];
    }

    /**
     * Participation belongs to the given event; reuses the event's tournament session.
     */
    public function forEvent(Event $event): static
    {
        $sessionId = Tournament::withoutGlobalScopes()
            ->find($event->tournament_id)
            ?->session_id
            ?? SportSession::factory()->create()->id;

        return $this->state([
            'event_id' => $event->id,
            'session_id' => $sessionId,
        ]);
    }
}
