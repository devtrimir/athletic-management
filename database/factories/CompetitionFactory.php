<?php

namespace Database\Factories;

use App\Models\Competition;
use App\Models\GameLevel;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Competition>
 */
class CompetitionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'game_level_id' => fn (array $attributes) => GameLevel::factory()->create(['organization_id' => $attributes['organization_id']])->id,
            'name_en' => fake()->unique()->words(3, true),
            'name_hi' => fake()->unique()->words(3, true),
            'sort_order' => fake()->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
