<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\Participation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Achievement>
 */
class AchievementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'participation_id' => Participation::factory(),
            'medal_type' => fake()->randomElement(['GOLD', 'SILVER', 'BRONZE', 'MERIT']),
            'position' => null,
            'remarks' => null,
        ];
    }

    /**
     * Achievement belongs to the given participation.
     */
    public function forParticipation(Participation $participation): static
    {
        return $this->state([
            'participation_id' => $participation->id,
        ]);
    }
}
