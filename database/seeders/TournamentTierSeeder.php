<?php

namespace Database\Seeders;

use App\Models\TournamentTier;
use Illuminate\Database\Seeder;

class TournamentTierSeeder extends Seeder
{
    public function run(): void
    {
        TournamentTier::upsert(
            [
                ['code' => 'INTERNATIONAL', 'label_hi' => 'अंतर्राष्ट्रीय', 'label_en' => 'International', 'weight' => 100],
                ['code' => 'NATIONAL',      'label_hi' => 'राष्ट्रीय',        'label_en' => 'National',      'weight' => 80],
                ['code' => 'AIPSC',         'label_hi' => 'अखिल भारतीय पुलिस खेल', 'label_en' => 'AIPSC',  'weight' => 70],
                ['code' => 'STATE',         'label_hi' => 'राज्यस्तरीय',      'label_en' => 'State',         'weight' => 60],
                ['code' => 'ZONAL',         'label_hi' => 'क्षेत्रीय',         'label_en' => 'Zonal',         'weight' => 40],
                ['code' => 'OTHER',         'label_hi' => 'अन्य',             'label_en' => 'Other',         'weight' => 10],
            ],
            uniqueBy: ['code'],
            update: ['label_hi', 'label_en', 'weight'],
        );
    }
}
