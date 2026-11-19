<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\PointScheme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PointScheme>
 */
class PointSchemeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'version_number' => fake()->unique()->numberBetween(1, 1000),
            'name' => 'Version '.fake()->numberBetween(1, 1000),
            'status' => PointScheme::STATUS_ACTIVE,
            'effective_from' => null,
            'published_at' => now(),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => PointScheme::STATUS_DRAFT, 'published_at' => null]);
    }

    public function effectiveFrom(string $date): static
    {
        return $this->state(['effective_from' => $date]);
    }
}
