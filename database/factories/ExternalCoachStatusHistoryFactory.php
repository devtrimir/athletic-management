<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExternalCoachStatusHistory>
 */
class ExternalCoachStatusHistoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'external_coach_id' => ExternalCoach::factory(),
            'status' => fake()->randomElement(['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted']),
            'reason' => fake()->optional()->sentence(),
            'recorded_by' => User::factory(),
            'recorded_at' => now(),
        ];
    }
}
