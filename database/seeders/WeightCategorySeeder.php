<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\GenderCategory;
use App\Models\Sport;
use App\Models\WeightCategory;
use Illuminate\Database\Seeder;

class WeightCategorySeeder extends Seeder
{
    public function run(): void
    {
        $sports = Sport::withoutGlobalScopes()->get()->keyBy('code');
        $genders = GenderCategory::all()->keyBy('code');

        foreach (SportMasterDataCatalog::weightCategories() as $sportCode => $categories) {
            $sport = $sports->get($sportCode);

            if ($sport === null) {
                $this->command?->warn("WeightCategorySeeder: sport {$sportCode} not found.");

                continue;
            }

            foreach ($categories as $category) {
                $gender = $category['gender'] !== null ? $genders->get($category['gender']) : null;

                WeightCategory::updateOrCreate(
                    [
                        'sport_id' => $sport->id,
                        'gender_category_id' => $gender?->id,
                        'code' => $category['code'],
                    ],
                    [
                        'name' => $category['name'],
                        'name_en' => $category['name_en'] ?? $category['name'],
                        'min_weight' => $category['min'],
                        'max_weight' => $category['max'],
                        'is_active' => true,
                        'sort_order' => $category['sort_order'],
                    ],
                );
            }
        }
    }
}
