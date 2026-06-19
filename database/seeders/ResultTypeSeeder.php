<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ResultType;
use Illuminate\Database\Seeder;

class ResultTypeSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SportMasterDataCatalog::resultTypes() as $type) {
            ResultType::updateOrCreate(
                ['code' => $type['code']],
                $type + ['is_active' => true],
            );
        }
    }
}
