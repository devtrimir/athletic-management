<?php

namespace Database\Factories;

use App\Models\GameLevel;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PointSchemeRow>
 */
class PointSchemeRowFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'point_scheme_id' => PointScheme::factory(),
            'game_level_id' => fn (array $attributes) => GameLevel::factory()->create([
                'organization_id' => PointScheme::query()->withoutGlobalScopes()->find($attributes['point_scheme_id'])->organization_id,
            ])->id,
            'result' => fake()->randomElement(PointScheme::RESULTS),
            'points' => fake()->numberBetween(0, 100),
        ];
    }
}
