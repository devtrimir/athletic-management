<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use SplFileObject;

class SportSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::firstOrCreate(
            ['code' => 'UPP'],
            ['name' => 'UP Police Sports Unit'],
        );

        $csv = new SplFileObject(database_path('data/sports.csv'));
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);

        $rows = [];
        $header = true;

        foreach ($csv as $line) {
            if ($header) {
                $header = false;

                continue;
            }

            [$nameHi, $nameEn, $category] = $line;

            $rows[] = [
                'organization_id' => $org->id,
                'name_hi' => $nameHi,
                'name_en' => $nameEn,
                'category' => $category,
                'slug' => Str::slug($nameEn),
            ];
        }

        Sport::upsert($rows, uniqueBy: ['organization_id', 'slug'], update: ['name_hi', 'name_en', 'category', 'updated_at']);
    }
}
