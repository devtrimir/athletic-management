<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ParticipationFormat;
use Illuminate\Database\Seeder;

class ParticipationFormatSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SportMasterDataCatalog::participationFormats() as $format) {
            ParticipationFormat::updateOrCreate(
                ['code' => $format['code']],
                $format + [
                    'name_en' => $format['name_en'] ?? $format['name'],
                    'is_active' => true,
                ],
            );
        }
    }
}
