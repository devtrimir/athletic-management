<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExternalCoach;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<ExternalCoach>
 */
class ExternalCoachFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->name(),
            'phone' => fake()->unique()->numerify('##########'),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'gender' => fake()->optional(0.8)->randomElement(['M', 'F', 'O']),
            'date_of_birth' => fake()->optional()->date(),
            'address' => fake()->optional()->address(),
            'city' => fake()->optional()->city(),
            'experience_years' => fake()->optional()->numberBetween(0, 40),
            'remarks' => fake()->optional()->sentence(),
            'status' => 'active',
            'remember_token' => Str::random(10),
        ];
    }

    public function inactive(): static
    {
        return $this->state(['status' => 'inactive']);
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }
}
