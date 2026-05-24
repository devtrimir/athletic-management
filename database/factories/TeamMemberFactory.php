<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeamMember>
 */
class TeamMemberFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'member_id' => Member::factory(),
            'session_id' => SportSession::factory(),
            'role' => fake()->randomElement(['PLAYER', 'CAPTAIN', 'RESERVE']),
            'joined_on' => fake()->optional(0.6)->date(),
            'left_on' => null,
        ];
    }

    public function captain(): static
    {
        return $this->state(['role' => 'CAPTAIN']);
    }

    public function reserve(): static
    {
        return $this->state(['role' => 'RESERVE']);
    }
}
