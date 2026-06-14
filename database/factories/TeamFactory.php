<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'sport_id' => Sport::factory(),
            'session_id' => SportSession::factory(),
            'unit_id' => Unit::factory(),
            'name' => fake()->words(3, true),
            'in_charge' => fake()->optional(0.6)->name(),
        ];
    }

    /**
     * All FK references share the given organisation.
     */
    public function forOrganization(Organization $org): static
    {
        return $this->state([
            'organization_id' => $org->id,
            'sport_id' => Sport::factory()->create(['organization_id' => $org->id])->id,
            'session_id' => SportSession::factory()->create(['organization_id' => $org->id])->id,
            'unit_id' => Unit::factory()->create(['organization_id' => $org->id])->id,
        ]);
    }
}
