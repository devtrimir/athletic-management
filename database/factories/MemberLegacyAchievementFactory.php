<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemberLegacyAchievement>
 */
class MemberLegacyAchievementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $member = Member::factory()->create();
        $sport = Sport::factory()->create(['organization_id' => $member->organization_id]);

        return [
            'organization_id' => $member->organization_id,
            'member_id' => $member->id,
            'period' => fake()->randomElement(['PRE_RECRUITMENT', 'POST_RECRUITMENT']),
            'level' => fake()->randomElement(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL']),
            'competition_details' => fake()->sentence(6),
            'event_date' => fake()->optional(0.8)->dateTimeBetween('-20 years', 'now'),
            'venue' => fake()->optional(0.7)->city(),
            'sport_id' => fake()->optional(0.8)->passthrough($sport->id),
            'sport_discipline' => fake()->optional(0.8)->randomElement(['Athletics', 'Boxing', 'Wrestling', 'Judo', 'Shooting', 'Swimming']),
            'event' => fake()->optional(0.6)->randomElement(['100m', '200m', '-60kg', '-73kg', '-81kg', 'Freestyle', 'Individual']),
            'discipline' => fake()->optional(0.6)->randomElement(['Sprint', 'Freestyle', 'Singles', 'Relay']),
            'weight_category' => fake()->optional(0.4)->randomElement(['60kg', '67kg', '74kg']),
            'gender_class' => fake()->optional(0.8)->randomElement(['M', 'F', 'MIXED', 'OPEN']),
            'medal_type' => fake()->optional(0.9)->randomElement(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE']),
            'sort_order' => null,
        ];
    }

    public function preRecruitment(): static
    {
        return $this->state(['period' => 'PRE_RECRUITMENT', 'level' => fake()->randomElement(['INTERNATIONAL', 'NATIONAL', 'STATE'])]);
    }

    public function postRecruitment(): static
    {
        return $this->state(['period' => 'POST_RECRUITMENT']);
    }

    public function forMember(Member $member): static
    {
        return $this->state([
            'organization_id' => $member->organization_id,
            'member_id' => $member->id,
        ]);
    }
}
