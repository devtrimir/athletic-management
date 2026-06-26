<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\TrainingVenue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TrainingVenue>
 */
class TrainingVenueFactory extends Factory
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
            'name' => fake()->company().' Stadium',
            'code' => fake()->unique()->bothify('VEN-###'),
            'address' => fake()->address(),
            'city' => fake()->city(),
            'state' => 'Uttar Pradesh',
            'latitude' => fake()->latitude(24.0, 31.0),
            'longitude' => fake()->longitude(77.0, 84.0),
            'allowed_radius_meters' => 200,
            'status' => 'active',
            'remarks' => fake()->optional()->sentence(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(['status' => 'inactive']);
    }

    public function underReview(): static
    {
        return $this->state(['status' => 'under_review']);
    }
}
