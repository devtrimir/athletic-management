<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AgeCategory;
use Illuminate\Database\Seeder;

class AgeCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (SportMasterDataCatalog::ageCategories() as $category) {
            AgeCategory::updateOrCreate(
                ['code' => $category['code']],
                $category + ['is_active' => true],
            );
        }
    }
}
