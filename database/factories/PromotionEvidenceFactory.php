<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\MemberPromotion;
use App\Models\PromotionEvidence;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PromotionEvidence>
 */
class PromotionEvidenceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => fn (array $attributes): int => MemberPromotion::query()->find($attributes['member_promotion_id'])->organization_id,
            'member_promotion_id' => MemberPromotion::factory(),
            'evidencable_type' => Achievement::class,
            'evidencable_id' => Achievement::factory(),
        ];
    }
}
