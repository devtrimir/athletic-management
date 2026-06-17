<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\District;
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
        $locationType = fake()->randomElement(['unit', 'district']);

        return [
            'organization_id' => Organization::factory(),
            'sport_id' => Sport::factory(),
            'session_id' => SportSession::factory(),
            'location_type' => $locationType,
            'district_id' => $locationType === 'district' ? District::factory() : null,
            'unit_id' => $locationType === 'unit' ? Unit::factory() : null,
            'name' => fake()->words(3, true),
            'in_charge' => fake()->optional(0.6)->name(),
            'is_active' => true,
        ];
    }

    /**
     * All FK references share the given organisation.
     */
    public function forOrganization(Organization $org): static
    {
        $unit = Unit::factory()->create(['organization_id' => $org->id]);

        return $this->state([
            'organization_id' => $org->id,
            'sport_id' => Sport::factory()->create(['organization_id' => $org->id])->id,
            'session_id' => SportSession::factory()->create(['organization_id' => $org->id])->id,
            'location_type' => 'unit',
            'district_id' => $unit->district_id,
            'unit_id' => $unit->id,
            'is_active' => true,
        ]);
    }

    public function districtBased(?District $district = null): static
    {
        return $this->state(function (array $attributes) use ($district): array {
            $resolvedDistrict = $district;

            if ($resolvedDistrict === null) {
                $resolvedDistrict = District::factory()->create();
            }

            return [
                'organization_id' => $attributes['organization_id'] ?? Organization::factory(),
                'location_type' => 'district',
                'district_id' => $resolvedDistrict->id,
                'unit_id' => null,
                'is_active' => true,
            ];
        });
    }
}
