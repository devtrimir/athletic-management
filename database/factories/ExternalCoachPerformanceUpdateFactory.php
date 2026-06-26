<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExternalCoachPerformanceUpdate>
 */
class ExternalCoachPerformanceUpdateFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'external_coaching_assignment_id' => ExternalCoachingAssignment::factory(),
            'member_id' => Member::factory(),
            'external_coach_id' => ExternalCoach::factory(),
            'sport_id' => Sport::factory(),
            'update_date' => fake()->date(),
            'performance_level' => fake()->randomElement(['improving', 'stable', 'needs_attention', 'excellent']),
            'performance_score' => fake()->numberBetween(1, 10),
            'training_summary' => fake()->sentence(12),
            'improvement_notes' => fake()->optional()->sentence(),
            'injury_or_fitness_notes' => fake()->optional()->sentence(),
            'next_focus' => fake()->optional()->sentence(),
            'review_status' => 'pending',
        ];
    }
}
