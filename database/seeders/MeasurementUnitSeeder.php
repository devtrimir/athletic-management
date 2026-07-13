<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\MeasurementUnit;
use Illuminate\Database\Seeder;

class MeasurementUnitSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SportMasterDataCatalog::measurementUnits() as $unit) {
            MeasurementUnit::updateOrCreate(
                ['code' => $unit['code']],
                $unit + [
                    'name_en' => $unit['name_en'] ?? $unit['name'],
                    'is_active' => true,
                ],
            );
        }
    }
}
