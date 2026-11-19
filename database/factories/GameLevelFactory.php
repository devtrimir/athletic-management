<?php

namespace Database\Factories;

use App\Models\GameLevel;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameLevel>
 */
class GameLevelFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'code' => strtoupper(fake()->unique()->lexify('LEVEL_????')),
            'name_en' => fake()->unique()->words(2, true),
            'name_hi' => fake()->unique()->words(2, true),
            'sort_order' => fake()->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
