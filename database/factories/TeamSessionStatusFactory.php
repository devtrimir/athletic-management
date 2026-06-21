<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamSessionStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeamSessionStatus>
 */
class TeamSessionStatusFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'organization_id' => $organization,
            'team_id' => Team::factory()->state(['organization_id' => $organization]),
            'session_id' => SportSession::factory()->state(['organization_id' => $organization]),
            'status' => TeamSessionStatus::STATUS_ACTIVE,
        ];
    }
}
