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

            [$name, $code] = $line;

            $rows[] = [
                'name' => $name,
                'name_en' => $name,
                'state' => 'Uttar Pradesh',
                'code' => $code,
            ];
        }

        District::upsert(
            $rows,
            uniqueBy: ['code'],
            update: ['name', 'name_en', 'state', 'updated_at'],
        );
    }
}
