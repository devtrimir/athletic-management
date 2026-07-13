<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Sport;
use App\Models\SportEvent;
use Illuminate\Database\Seeder;

class SportEventSeeder extends Seeder
{
    public function run(): void
    {
        $sports = Sport::withoutGlobalScopes()->get()->keyBy('code');

        foreach (SportMasterDataCatalog::sportEvents() as $sportCode => $events) {
            $sport = $sports->get($sportCode);

            if ($sport === null) {
                $this->command?->warn("SportEventSeeder: sport {$sportCode} not found.");

                continue;
            }

            foreach ($events as $index => $event) {
                SportEvent::updateOrCreate(
                    [
                        'sport_id' => $sport->id,
                        'code' => $event['code'],
                    ],
                    [
                        'name' => $event['name'],
                        'name_en' => $event['name_en'] ?? $event['name'],
                        'discipline_type' => $event['discipline_type'],
                        'is_active' => true,
                        'sort_order' => ($index + 1) * 10,
                    ],
                );
            }
        }
    }
}
