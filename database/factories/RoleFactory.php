<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
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
            'code' => fake()->unique()->slug(1),
            'name_hi' => fake()->words(2, true),
            'name_en' => fake()->words(2, true),
            'is_system' => false,
            'description' => null,
        ];
    }
}
