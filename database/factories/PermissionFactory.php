<?php

namespace Database\Factories;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Permission>
 */
class PermissionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $actions = ['view', 'create', 'update', 'delete', 'restore'];
        $groups = ['members', 'coaches', 'teams', 'tournaments', 'imports', 'reports', 'settings', 'audit'];
        $group = fake()->randomElement($groups);
        $action = fake()->randomElement($actions);

        return [
            'code' => $group.'.'.$action.'_'.fake()->unique()->numerify('###'),
            'group' => $group,
            'name_hi' => fake()->words(2, true),
            'name_en' => fake()->words(2, true),
            'description' => null,
        ];
    }
}
