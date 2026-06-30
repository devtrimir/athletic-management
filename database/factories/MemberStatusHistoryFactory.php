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
            'status' => fake()->randomElement(Member::STATUSES),
            'effective_on' => fake()->dateTimeBetween('-5 years', 'now'),
            'reason' => fake()->optional(0.6)->sentence(),
            'recorded_by' => null,
        ];
    }
}
