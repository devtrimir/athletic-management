<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachStatusHistory>
 */
class CoachStatusHistoryFactory extends Factory
{
    protected $model = CoachStatusHistory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'coach_id' => Coach::factory(),
            'status' => fake()->randomElement(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED']),
            'effective_on' => fake()->date(),
            'reason' => fake()->optional()->sentence(),
            'recorded_by' => User::factory(),
        ];
    }
}
