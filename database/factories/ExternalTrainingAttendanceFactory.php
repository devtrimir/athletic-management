<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalTrainingAttendance;
use App\Models\Member;
use App\Models\Organization;
use App\Models\TrainingVenue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExternalTrainingAttendance>
 */
class ExternalTrainingAttendanceFactory extends Factory
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
            'training_venue_id' => TrainingVenue::factory(),
            'attendance_date' => fake()->date(),
            'attendance_status' => 'present',
            'review_status' => 'pending',
            'geo_status' => 'valid',
            'submitted_at' => now(),
            'submitted_latitude' => 26.8467,
            'submitted_longitude' => 80.9462,
            'submitted_gps_accuracy' => 20,
            'distance_from_venue_meters' => 0,
            'submitted_photo_path' => 'external-training-attendance/example.jpg',
            'submitted_photo_original_name' => 'proof.jpg',
            'submitted_photo_mime_type' => 'image/jpeg',
            'submitted_photo_size_bytes' => 102400,
            'submitted_photo_uploaded_at' => now(),
            'submitted_photo_width' => 800,
            'submitted_photo_height' => 600,
            'submitted_photo_source' => 'upload',
        ];
    }
}
