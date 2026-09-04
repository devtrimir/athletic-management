<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\Member;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coach>
 */
class CoachFactory extends Factory
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
            'member_id' => null,
            'full_name' => fake()->name(),
            'pno' => fake()->optional(0.6)->numerify('##########'),
            'mobile' => fake()->optional(0.7)->numerify('##########'),
            'display_name' => null,
            'email' => fake()->optional()->safeEmail(),
            'gender' => fake()->optional(0.8)->randomElement(['M', 'F', 'O']),
            'date_of_birth' => fake()->optional()->date(),
            'coach_status' => fake()->randomElement(['ACTIVE', 'INACTIVE', 'RETIRED']),
            'bio' => fake()->optional()->paragraph(),
            'address' => fake()->optional()->address(),
            'photo_path' => null,
        ];
    }

    /**
     * Coach is linked to an existing (or new) member record.
     */
    public function withMember(?Member $member = null): static
    {
        return $this->state(function (array $attributes) use ($member): array {
            $linked = $member ?? Member::factory()->create([
                'organization_id' => $attributes['organization_id'] instanceof Factory
                    ? Organization::factory()->create()->id
                    : $attributes['organization_id'],
            ]);

            return [
                'member_id' => $linked->id,
                'full_name' => $linked->full_name,
                'pno' => $linked->pno,
            ];
        });
    }

    /**
     * Coach has no member link (external / civilian coach).
     */
    public function standalone(): static
    {
        return $this->state(['member_id' => null]);
    }
}
