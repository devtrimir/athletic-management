<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\MemberStatusHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemberStatusHistory>
 */
class MemberStatusHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'status' => fake()->randomElement(['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED']),
            'effective_on' => fake()->dateTimeBetween('-5 years', 'now'),
            'reason_hi' => fake()->optional(0.6)->sentence(),
            'recorded_by' => null,
        ];
    }
}
