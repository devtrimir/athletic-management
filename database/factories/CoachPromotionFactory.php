<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachPromotion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachPromotion>
 */
class CoachPromotionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => fn (array $attributes): int => Coach::query()->find($attributes['coach_id'])->organization_id,
            'coach_id' => Coach::factory(),
            'promotion_date' => fake()->date(),
            'from_rank' => 'CONSTABLE',
            'to_rank' => 'HEAD_CONSTABLE',
            'cash_reward_amount' => fake()->optional()->randomFloat(2, 1000, 50000),
            'cash_reward_date' => fake()->optional()->date(),
            'cash_reward_reference' => fake()->optional()->bothify('ORDER-###'),
            'cash_reward_remarks' => fake()->optional()->sentence(),
            'reason' => fake()->sentence(),
            'remarks' => fake()->optional()->sentence(),
        ];
    }
}
