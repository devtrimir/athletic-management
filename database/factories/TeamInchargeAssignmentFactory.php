<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeamInchargeAssignment>
 */
class TeamInchargeAssignmentFactory extends Factory
{
    protected $model = TeamInchargeAssignment::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'incharge_id' => null,
            'full_name' => fake()->name(),
            'pno' => fake()->numerify('##########'),
            'rank' => fake()->randomElement(['Constable', 'Head Constable', 'SI']),
            'mobile' => fake()->optional()->numerify('##########'),
            'email' => fake()->optional()->safeEmail(),
            'assigned_at' => now()->subDays(fake()->numberBetween(1, 60)),
            'removed_at' => null,
            'assigned_by' => User::factory(),
            'removed_by' => null,
            'assignment_reason' => fake()->optional()->sentence(),
            'removal_reason' => null,
            'remarks' => fake()->optional()->sentence(),
            'is_current' => true,
            'current_team_id' => null,
        ];
    }

    public function configure(): static
    {
        return $this->state(function (array $attributes): array {
            return [
                'current_team_id' => ($attributes['is_current'] ?? true)
                    ? ($attributes['team_id'] ?? null)
                    : null,
            ];
        });
    }

    public function history(): static
    {
        return $this->state(fn () => [
            'is_current' => false,
            'current_team_id' => null,
            'removed_at' => now()->subDay(),
            'removed_by' => User::factory(),
        ]);
    }
}
