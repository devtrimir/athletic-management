<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\District;
use App\Models\Organization;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds real UP Police PAC and district units from database/data/pac_units.csv.
 *
 * Run order: after DistrictSeeder (needs districts table populated for FK).
 */
class UnitSeeder extends Seeder
{
    /**
     * City keyword → district name overrides for cases where the keyword
     * extracted from the unit name does not exactly match a district row.
     *
     * @var array<string, string>
     */
    private const CITY_TO_DISTRICT = [
        'गौतमबुद्धनगर' => 'गौतम बुद्ध नगर',
        'गोण्डा' => 'गोण्डा',
        'गोरखपुर' => 'गोरखपुर',
        'कानपुर' => 'कानपुर नगर',
        'प्रयागराज' => 'प्रयागराज',
        'मुरादाबाद' => 'मुरादाबाद',
        'आजमगढ़' => 'आजमगढ़',
        'मेरठ' => 'मेरठ',
        'बाराबंकी' => 'बाराबंकी',
        'सीतापुर' => 'सीतापुर',
        'फतेहपुर' => 'फतेहपुर',
        'आगरा' => 'आगरा',
        'वाराणसी' => 'वाराणसी',
        'लखनऊ' => 'लखनऊ',
        'अलीगढ़' => 'अलीगढ़',
        'मिर्जापुर' => 'मिर्जापुर',
        'गाजियाबाद' => 'गाजियाबाद',
        'एटा' => 'एटा',
        'सोनभद्र' => 'सोनभद्र',
        'मुजफ्फरनगर' => 'मुजफ्फरनगर',
    ];

    public function run(): void
    {
        $org = Organization::firstOrFail();

        /** @var array<string, int> $districtMap name → id */
        $districtMap = District::query()
            ->pluck('id', 'name')
            ->all();

        $csvPath = database_path('data/pac_units.csv');

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            $this->command->error("Cannot open {$csvPath}");

            return;
        }

        // Skip header row
        fgetcsv($handle);

        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) < 2) {
                continue;
            }

            [$name, $unitType] = $line;
            $name = trim($name);
            $unitType = trim($unitType);

            if (empty($name)) {
                continue;
            }

            $districtId = $this->resolveDistrict($name, $districtMap);

            $rows[] = [
                'organization_id' => $org->id,
                'name' => $name,
                'unit_type' => $unitType,
                'commandant' => null,
                'district_id' => $districtId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        fclose($handle);

        if (empty($rows)) {
            return;
        }

        // Upsert by (organization_id, name) — no unique index, so we do
        // an updateOrInsert per row to stay idempotent.
        foreach ($rows as $row) {
            DB::table('units')->updateOrInsert(
                ['organization_id' => $row['organization_id'], 'name' => $row['name']],
                $row,
            );
        }

        $this->command->info('UnitSeeder: seeded '.count($rows).' units.');
    }

    /**
     * Resolve district_id by extracting the trailing city keyword from the
     * unit's Hindi name and looking it up in the districts table.
     *
     * @param  array<string, int>  $districtMap
     */
    private function resolveDistrict(string $nameHi, array $districtMap): ?int
    {
        // Last word (space-delimited) is usually the city name.
        $parts = explode(' ', $nameHi);
        $city = end($parts);

        // Apply override if present.
        $lookup = self::CITY_TO_DISTRICT[$city] ?? $city;

        return $districtMap[$lookup] ?? null;
    }
}
