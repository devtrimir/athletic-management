<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use App\Models\NameAlias;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NameAlias>
 */
class NameAliasFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'alias_hi' => fake()->name(),
            'alias_normalized' => null,
            'source' => fake()->randomElement(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual']),
        ];
    }
}
