<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coach;
use App\Models\CoachAlias;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachAlias>
 */
class CoachAliasFactory extends Factory
{
    protected $model = CoachAlias::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'coach_id' => Coach::factory(),
            'alias' => fake()->name(),
            'alias_normalized' => null,
            'source' => fake()->randomElement(['krutidev', 'spelling_variant', 'rank_prefixed', 'legacy', 'manual']),
        ];
    }
}
