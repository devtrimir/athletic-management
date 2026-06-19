<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\GenderCategory;
use Illuminate\Database\Seeder;

class GenderCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (SportMasterDataCatalog::genderCategories() as $category) {
            GenderCategory::updateOrCreate(
                ['code' => $category['code']],
                $category + ['is_active' => true],
            );
        }
    }
}
