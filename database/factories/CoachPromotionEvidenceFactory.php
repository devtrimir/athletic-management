<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\Event;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachPromotionEvidence>
 */
class CoachPromotionEvidenceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => fn (array $attributes): int => CoachPromotion::query()->find($attributes['coach_promotion_id'])->organization_id,
            'coach_promotion_id' => CoachPromotion::factory(),
            'session_id' => SportSession::factory(),
            'tournament_id' => Tournament::factory(),
            'event_id' => Event::factory(),
            'team_id' => Team::factory(),
            'achievement_id' => Achievement::factory(),
        ];
    }
}
