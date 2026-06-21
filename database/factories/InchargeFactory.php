<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Incharge;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incharge>
 */
class InchargeFactory extends Factory
{
    protected $model = Incharge::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'full_name' => fake()->name(),
            'pno' => fake()->unique()->numerify('##########'),
            'rank' => fake()->randomElement(['Constable', 'Head Constable', 'SI', 'Inspector']),
            'designation' => fake()->optional()->jobTitle(),
            'mobile' => fake()->optional()->numerify('##########'),
            'email' => fake()->optional()->safeEmail(),
            'is_active' => true,
            'remarks' => fake()->optional()->sentence(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => ['organization_id' => $organization->id]);
    }
}
