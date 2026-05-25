<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $year = fake()->numberBetween(2015, 2026);
        $seq = str_pad((string) fake()->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT);

        return [
            'organization_id' => Organization::factory(),
            'member_code' => "UPP-{$year}-{$seq}",
            'pno' => fake()->optional(0.7)->numerify('##########'),
            'full_name_hi' => fake()->name(),
            'full_name_en' => fake()->optional(0.6)->name(),
            'full_name_normalized' => null,
            'father_name_hi' => fake()->optional(0.8)->name(),
            'rank' => fake()->optional(0.5)->randomElement(['Constable', 'Head Constable', 'SI', 'Inspector']),
            'gender' => fake()->randomElement(['M', 'F', 'O']),
            'dob' => fake()->optional(0.9)->dateTimeBetween('-55 years', '-18 years'),
            'joining_date' => fake()->optional(0.9)->dateTimeBetween('-30 years', 'now'),
            'mobile' => fake()->optional(0.7)->numerify('##########'),
            'home_district_id' => null,
            'current_unit_id' => null,
            'player_category' => fake()->randomElement(['GD', 'SKILLED']),
            'player_level' => fake()->randomElement(['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC']),
            'current_status' => 'ACTIVE',
            'source_refs' => null,
            // New P2B profile fields — all nullable for backwards compat
            'photo_path' => null,
            'blood_group' => fake()->optional(0.5)->randomElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
            'caste' => null,
            'promotion_date' => fake()->optional(0.3)->dateTimeBetween('-10 years', 'now'),
            'appointment' => null,
            'home_address' => null,
            'recruitment_type' => fake()->optional(0.6)->randomElement(['DIRECT', 'SPORTS_QUOTA', 'PROMOTED', 'OTHER']),
            'sport_event' => fake()->optional(0.4)->randomElement(['100m', '200m', '1500m', '-60kg', '-73kg', '-81kg', 'Freestyle']),
            'other_notes' => null,
            'team_since' => fake()->optional(0.5)->dateTimeBetween('-15 years', 'now'),
        ];
    }
}
