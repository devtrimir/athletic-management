<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SportSession;
use Illuminate\Database\Seeder;

class SportSessionSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::firstOrCreate(
            ['code' => 'UPP'],
            ['name' => 'UP Police Sports Unit'],
        );

        $rows = [];

        foreach (range(2019, 2026) as $year) {
            $rows[] = [
                'organization_id' => $org->id,
                'name' => $year.'-'.substr((string) ($year + 1), 2),
                'start_year' => $year,
                'end_year' => $year + 1,
                'is_current' => $year === 2026,
            ];
        }

        SportSession::upsert($rows, uniqueBy: ['organization_id', 'name'], update: ['start_year', 'end_year', 'is_current', 'updated_at']);
    }
}
