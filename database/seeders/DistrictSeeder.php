<?php

namespace Database\Seeders;

use App\Models\District;
use Illuminate\Database\Seeder;
use SplFileObject;

class DistrictSeeder extends Seeder
{
    public function run(): void
    {
        $csv = new SplFileObject(database_path('data/up_districts.csv'));
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);

        $rows = [];
        $header = true;

        foreach ($csv as $line) {
            if ($header) {
                $header = false;

                continue;
            }

            [$nameHi, $nameEn, $code] = $line;

            $rows[] = [
                'name_hi' => $nameHi,
                'name_en' => $nameEn,
                'state' => 'Uttar Pradesh',
                'code' => $code,
            ];
        }

        District::upsert($rows, uniqueBy: ['code'], update: ['name_hi', 'name_en', 'state', 'updated_at']);
    }
}
