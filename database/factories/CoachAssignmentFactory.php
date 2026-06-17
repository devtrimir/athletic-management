<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\SportSession;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachAssignment>
 */
class CoachAssignmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'coach_id' => Coach::factory(),
            'session_id' => SportSession::factory(),
            'role' => fake()->randomElement(['HEAD', 'ASSISTANT']),
            'assigned_at' => now(),
            'is_current' => true,
        ];
    }

    public function head(): static
    {
        return $this->state(['role' => 'HEAD']);
    }

    public function assistant(): static
    {
        return $this->state(['role' => 'ASSISTANT']);
    }
}
