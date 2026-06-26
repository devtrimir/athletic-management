<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\TrainingVenue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExternalCoachingAssignment>
 */
class ExternalCoachingAssignmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-1 month', '+1 month');

        return [
            'organization_id' => Organization::factory(),
            'member_id' => Member::factory(),
            'external_coach_id' => ExternalCoach::factory(),
            'training_venue_id' => TrainingVenue::factory(),
            'sport_id' => Sport::factory(),
            'start_date' => $startDate,
            'end_date' => fake()->dateTimeBetween($startDate, '+4 months'),
            'attendance_mode' => 'single_mark',
            'status' => 'active',
        ];
    }
}
