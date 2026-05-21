<?php

namespace Database\Factories;

use App\Models\TournamentTier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TournamentTier>
 */
class TournamentTierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tiers = [
            ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतरराष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
            ['code' => 'NATIONAL',      'label_hi' => 'राष्ट्रीय',       'label_en' => 'National',      'weight' => 80],
            ['code' => 'AIPSC',         'label_hi' => 'एआईपीएससी',        'label_en' => 'AIPSC',         'weight' => 70],
            ['code' => 'STATE',         'label_hi' => 'राज्य',          'label_en' => 'State',         'weight' => 60],
            ['code' => 'ZONAL',         'label_hi' => 'ज़ोनल',         'label_en' => 'Zonal',         'weight' => 40],
            ['code' => 'OTHER',         'label_hi' => 'अन्य',           'label_en' => 'Other',         'weight' => 10],
        ];

        $tier = fake()->unique()->randomElement($tiers);

        return [
            'code' => $tier['code'],
            'label_hi' => $tier['label_hi'],
            'label_en' => $tier['label_en'],
            'weight' => $tier['weight'],
        ];
    }
}
