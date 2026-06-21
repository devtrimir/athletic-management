<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\MemberSpecialAchievement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MemberSpecialAchievement>
 */
class MemberSpecialAchievementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $member = Member::factory()->create();

        return [
            'organization_id' => $member->organization_id,
            'member_id' => $member->id,
            'achievement_type' => fake()->randomElement([
                'COMMENDATION_DISC',
                'APPRECIATION_LETTER',
                'HONOUR_CERTIFICATE',
                'SPECIAL_RECOGNITION',
                'OTHER',
            ]),
            'title' => fake()->randomElement([
                'Commendation Disc',
                'Special Duty Recognition',
                'Departmental Appreciation',
            ]),
            'awarded_on' => fake()->optional(0.85)->dateTimeBetween('-15 years', 'now'),
            'issuing_authority' => fake()->optional(0.8)->randomElement([
                'DGP UP',
                'ADG Sports',
                'Commandant',
            ]),
            'order_reference' => fake()->optional(0.7)->bothify('UPP/SA/####'),
            'order_document_path' => null,
            'order_document_original_name' => null,
            'order_document_mime_type' => null,
            'order_document_size_bytes' => null,
            'place' => fake()->optional(0.6)->city(),
            'remarks' => fake()->optional(0.4)->sentence(),
        ];
    }

    public function forMember(Member $member): static
    {
        return $this->state([
            'organization_id' => $member->organization_id,
            'member_id' => $member->id,
        ]);
    }

    public function commendationDisc(): static
    {
        return $this->state([
            'achievement_type' => 'COMMENDATION_DISC',
            'title' => 'Commendation Disc',
        ]);
    }
}
