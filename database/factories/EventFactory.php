<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Event;
use App\Models\Sport;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tournament_id' => Tournament::factory(),
            'sport_id' => Sport::factory(),
            'name' => fake()->words(3, true),
            'discipline' => fake()->optional(0.5)->word(),
            'weight_category' => null,
            'gender_class' => fake()->randomElement(['M', 'F', 'MIXED', 'OPEN']),
        ];
    }

    /**
     * Event belongs to the given tournament and shares its sport.
     */
    public function forTournament(Tournament $tournament): static
    {
        return $this->state([
            'tournament_id' => $tournament->id,
            'sport_id' => $tournament->sport_id
                ?? Sport::factory()->create(['organization_id' => $tournament->organization_id])->id,
        ]);
    }
}
