<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Unit;
use App\Models\UnitType;
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
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->words(2, true),
            'unit_type_id' => UnitType::query()->inRandomOrder()->value('id') ?? UnitType::factory(),
            'commandant' => null,
            'district_id' => null,
        ];
    }
}
