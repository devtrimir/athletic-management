<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachCertification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachCertification>
 */
class CoachCertificationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'coach_id' => Coach::factory(),
            'name' => fake()->randomElement(['NIS Coaching Certification', 'Referee License', 'Sports Medicine']),
            'certificate_type' => fake()->randomElement(['NIS', 'LICENCE', 'FITNESS']),
            'issuer' => fake()->company(),
            'issued_at' => fake()->optional()->date(),
            'expired_at' => fake()->optional()->date(),
            'attachment_path' => null,
            'attachment_original_name' => null,
            'mime_type' => null,
            'size_bytes' => null,
            'metadata' => null,
        ];
    }
}
