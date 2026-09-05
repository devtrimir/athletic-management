<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachPlayingAchievement;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachPlayingAchievement>
 */
class CoachPlayingAchievementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $coach = Coach::factory()->create();

        return [
            'organization_id' => $coach->organization_id,
            'coach_id' => $coach->id,
            'sport_id' => Sport::factory()->state(['organization_id' => $coach->organization_id]),
            'title' => fake()->randomElement([
                'National Police Games',
                'All India Police Sports Meet',
                'State Athletics Championship',
            ]),
            'period' => fake()->randomElement(['PRE_RECRUITMENT', 'POST_RECRUITMENT']),
            'level' => fake()->randomElement(['NATIONAL', 'AIPSC', 'STATE']),
            'competition_details' => fake()->sentence(),
            'event_date' => fake()->dateTimeBetween('-25 years', 'now'),
            'venue' => fake()->optional(0.8)->city(),
            'event' => fake()->optional(0.6)->randomElement(['100m Sprint', 'Heavy Weight', 'Freestyle 74kg']),
            'discipline' => null,
            'weight_category' => null,
            'gender_class' => fake()->optional(0.5)->randomElement(['M', 'F', 'MIXED', 'OPEN']),
            'medal_type' => fake()->optional(0.85)->randomElement(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE']),
            'position' => fake()->optional(0.4)->numberBetween(1, 8),
            'description' => fake()->optional(0.4)->sentence(),
            'achieved_on' => fake()->optional(0.8)->dateTimeBetween('-25 years', 'now'),
            'remarks' => fake()->optional(0.3)->sentence(),
        ];
    }

    public function forCoach(Coach $coach): static
    {
        return $this->state([
            'organization_id' => $coach->organization_id,
            'coach_id' => $coach->id,
        ]);
    }
}
