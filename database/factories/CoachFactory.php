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
            'full_name_hi' => fake()->name(),
            'full_name_en' => fake()->optional(0.5)->name(),
            'pno' => fake()->optional(0.6)->numerify('##########'),
            'mobile' => fake()->optional(0.7)->numerify('##########'),
            'nis_certified' => fake()->boolean(30),
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
                'full_name_hi' => $linked->full_name_hi,
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

    /**
     * Coach holds an NIS certificate.
     */
    public function nisCertified(): static
    {
        return $this->state(['nis_certified' => true]);
    }
}
