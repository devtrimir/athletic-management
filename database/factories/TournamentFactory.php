<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Organization;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tournament>
 */
class TournamentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'session_id' => SportSession::factory(),
            'tier_id' => fn () => TournamentTier::firstOrCreate(
                ['code' => 'NATIONAL'],
                ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
            )->id,
            'sport_id' => null,
            'name' => fake()->words(4, true),
            'venue' => fake()->optional(0.7)->city(),
            'date_from' => null,
            'date_to' => null,
            'raw_date_text' => null,
        ];
    }

    /**
     * All FK references share the given organisation.
     */
    public function forOrganization(Organization $org): static
    {
        return $this->state([
            'organization_id' => $org->id,
            'session_id' => SportSession::factory()->create(['organization_id' => $org->id])->id,
            'tier_id' => TournamentTier::firstOrCreate(
                ['code' => 'NATIONAL'],
                ['label_hi' => 'राष्ट्रीय', 'label_en' => 'National', 'weight' => 80],
            )->id,
        ]);
    }
}
