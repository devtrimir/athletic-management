<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachSport;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachSport>
 */
class CoachSportFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'coach_id' => Coach::factory(),
            'sport_id' => Sport::factory(),
            'is_primary' => fake()->boolean(),
            'level' => fake()->optional()->randomElement(['A', 'B', 'C', 'D']),
            'effective_from' => fake()->optional()->date(),
            'effective_to' => fake()->optional()->date(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
