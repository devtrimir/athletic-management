<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\AchievementBenefit;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AchievementBenefit>
 */
class AchievementBenefitFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $achievement = Achievement::factory()->create();
        $benefitType = fake()->randomElement(['PROMOTION', 'OUT_OF_TURN_PROMOTION', 'CASH_AWARD', 'COMMENDATION', 'NONE', 'OTHER']);

        $achievement->loadMissing('participation.member');

        return [
            'organization_id' => $achievement->participation?->member?->organization_id
                ?? Organization::factory(),
            'benefitable_type' => Achievement::class,
            'benefitable_id' => $achievement->id,
            'benefit_type' => $benefitType,
            'promoted_from_rank' => in_array($benefitType, ['PROMOTION', 'OUT_OF_TURN_PROMOTION'], true)
                ? fake()->randomElement(['Constable', 'Head Constable', 'SI'])
                : null,
            'promoted_to_rank' => in_array($benefitType, ['PROMOTION', 'OUT_OF_TURN_PROMOTION'], true)
                ? fake()->randomElement(['Head Constable', 'SI', 'Inspector'])
                : null,
            'cash_amount' => $benefitType === 'CASH_AWARD' ? fake()->randomFloat(2, 5000, 100000) : null,
            'benefit_date' => fake()->optional(0.7)->dateTimeBetween('-15 years', 'now'),
            'order_reference' => fake()->optional(0.6)->bothify('??/####/???'),
            'remarks' => fake()->optional(0.3)->sentence(),
        ];
    }

    public function promotion(): static
    {
        return $this->state([
            'benefit_type' => 'PROMOTION',
            'promoted_from_rank' => 'Constable',
            'promoted_to_rank' => 'Head Constable',
            'cash_amount' => null,
        ]);
    }

    public function cashAward(float $amount = 25000.00): static
    {
        return $this->state([
            'benefit_type' => 'CASH_AWARD',
            'cash_amount' => $amount,
            'promoted_from_rank' => null,
            'promoted_to_rank' => null,
        ]);
    }

    public function none(): static
    {
        return $this->state([
            'benefit_type' => 'NONE',
            'promoted_from_rank' => null,
            'promoted_to_rank' => null,
            'cash_amount' => null,
        ]);
    }
}
