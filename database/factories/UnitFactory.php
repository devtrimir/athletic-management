<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $types = ['PAC', 'GRP', 'DISTRICT', 'HQ', 'OTHER'];

        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->words(2, true),
            'unit_type' => fake()->randomElement($types),
            'commandant' => null,
            'district_id' => null,
        ];
    }
}
