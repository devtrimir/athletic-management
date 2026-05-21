<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\SportSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SportSession>
 */
class SportSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startYear = fake()->numberBetween(2019, 2026);

        return [
            'organization_id' => Organization::factory(),
            'name' => $startYear.'-'.($startYear + 1),
            'start_year' => $startYear,
            'end_year' => $startYear + 1,
            'is_current' => false,
            //
        ];
    }
}
