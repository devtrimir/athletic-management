<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use Illuminate\Database\Seeder;

class TournamentSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::firstOrFail();
        $orgId = $org->id;

        $session = SportSession::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('is_current', true)
            ->first()
            ?? SportSession::withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->latest()
                ->first();

        if ($session === null) {
            $this->command->warn('TournamentSeeder: no SportSession found — run SportSessionSeeder first.');

            return;
        }

        $tiers = TournamentTier::all()->keyBy('code');

        if ($tiers->isEmpty()) {
            $this->command->warn('TournamentSeeder: no TournamentTiers found — run TournamentTierSeeder first.');

            return;
        }

        /** @var array<string, int> $sports name → id */
        $sports = Sport::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->pluck('id', 'name')
            ->all();

        $startYear = $session->start_year;

        /**
         * @var list<array{name: string, tier: string, sport: string|null, venue: string|null, date_from: string|null, date_to: string|null, raw_date_text: string|null, events: list<array{name: string, sport: string, discipline: string|null, weight_category?: string|null, gender_class: string}>}>
         */
        $definitions = [
            [
                'name' => 'अखिल भारतीय पुलिस खेल-कूद प्रतियोगिता',
                'tier' => 'AIPSC',
                'sport' => null,
                'venue' => 'नई दिल्ली',
                'date_from' => $startYear.'-11-01',
                'date_to' => $startYear.'-11-10',
                'raw_date_text' => null,
                'events' => [
                    ['name' => '100 मीटर दौड़', 'sport' => 'एथलेटिक्स', 'discipline' => '100m', 'gender_class' => 'M'],
                    ['name' => '4×100 मीटर रिले', 'sport' => 'एथलेटिक्स', 'discipline' => '4x100m Relay', 'gender_class' => 'M'],
                    ['name' => 'मुक्केबाजी 60 कि.ग्रा.', 'sport' => 'मुक्केबाजी', 'discipline' => null, 'weight_category' => '60kg', 'gender_class' => 'M'],
                ],
            ],
            [
                'name' => 'राष्ट्रीय एथलेटिक्स प्रतियोगिता',
                'tier' => 'NATIONAL',
                'sport' => 'एथलेटिक्स',
                'venue' => 'लखनऊ',
                'date_from' => $startYear.'-09-15',
                'date_to' => $startYear.'-09-18',
                'raw_date_text' => null,
                'events' => [
                    ['name' => '200 मीटर दौड़ (पुरुष)', 'sport' => 'एथलेटिक्स', 'discipline' => '200m', 'gender_class' => 'M'],
                    ['name' => '200 मीटर दौड़ (महिला)', 'sport' => 'एथलेटिक्स', 'discipline' => '200m', 'gender_class' => 'F'],
                    ['name' => 'लंबी कूद', 'sport' => 'एथलेटिक्स', 'discipline' => 'Long Jump', 'gender_class' => 'M'],
                ],
            ],
            [
                'name' => 'राज्यस्तरीय कुश्ती प्रतियोगिता',
                'tier' => 'STATE',
                'sport' => 'कुश्ती',
                'venue' => 'वाराणसी',
                'date_from' => $startYear.'-10-05',
                'date_to' => $startYear.'-10-07',
                'raw_date_text' => null,
                'events' => [
                    ['name' => 'फ्रीस्टाइल 65 कि.ग्रा.', 'sport' => 'कुश्ती', 'discipline' => 'Freestyle', 'weight_category' => '65kg', 'gender_class' => 'M'],
                    ['name' => 'फ्रीस्टाइल 74 कि.ग्रा.', 'sport' => 'कुश्ती', 'discipline' => 'Freestyle', 'weight_category' => '74kg', 'gender_class' => 'M'],
                    ['name' => 'ग्रीको-रोमन 67 कि.ग्रा.', 'sport' => 'कुश्ती', 'discipline' => 'Greco-Roman', 'weight_category' => '67kg', 'gender_class' => 'M'],
                ],
            ],
            [
                'name' => 'राज्यस्तरीय तैराकी प्रतियोगिता',
                'tier' => 'STATE',
                'sport' => 'तैराकी',
                'venue' => 'आगरा',
                'date_from' => $startYear.'-08-20',
                'date_to' => $startYear.'-08-22',
                'raw_date_text' => null,
                'events' => [
                    ['name' => '100 मीटर फ्रीस्टाइल (पुरुष)', 'sport' => 'तैराकी', 'discipline' => 'Freestyle', 'gender_class' => 'M'],
                    ['name' => '200 मीटर ब्रेस्टस्ट्रोक (पुरुष)', 'sport' => 'तैराकी', 'discipline' => 'Breaststroke', 'gender_class' => 'M'],
                ],
            ],
            [
                'name' => 'क्षेत्रीय बैडमिंटन प्रतियोगिता',
                'tier' => 'ZONAL',
                'sport' => 'बैडमिंटन',
                'venue' => 'कानपुर',
                'date_from' => $startYear.'-07-10',
                'date_to' => $startYear.'-07-12',
                'raw_date_text' => null,
                'events' => [
                    ['name' => 'पुरुष एकल', 'sport' => 'बैडमिंटन', 'discipline' => 'Singles', 'gender_class' => 'M'],
                    ['name' => 'महिला एकल', 'sport' => 'बैडमिंटन', 'discipline' => 'Singles', 'gender_class' => 'F'],
                    ['name' => 'मिश्रित युगल', 'sport' => 'बैडमिंटन', 'discipline' => 'Mixed Doubles', 'gender_class' => 'MIXED'],
                ],
            ],
            [
                'name' => 'क्षेत्रीय शूटिंग प्रतियोगिता',
                'tier' => 'ZONAL',
                'sport' => 'शूटिंग',
                'venue' => 'प्रयागराज',
                'date_from' => ($startYear + 1).'-01-15',
                'date_to' => ($startYear + 1).'-01-17',
                'raw_date_text' => null,
                'events' => [
                    ['name' => '10 मीटर एयर राइफल', 'sport' => 'शूटिंग', 'discipline' => 'Air Rifle 10m', 'gender_class' => 'M'],
                    ['name' => '25 मीटर पिस्टल', 'sport' => 'शूटिंग', 'discipline' => 'Pistol 25m', 'gender_class' => 'M'],
                ],
            ],
            [
                'name' => 'उ.प्र. पुलिस आंतरिक एथलेटिक्स',
                'tier' => 'OTHER',
                'sport' => 'एथलेटिक्स',
                'venue' => 'लखनऊ पुलिस लाइन्स',
                'date_from' => ($startYear + 1).'-02-10',
                'date_to' => ($startYear + 1).'-02-11',
                'raw_date_text' => null,
                'events' => [
                    ['name' => '1500 मीटर दौड़', 'sport' => 'एथलेटिक्स', 'discipline' => '1500m', 'gender_class' => 'M'],
                    ['name' => 'गोला फेंक', 'sport' => 'एथलेटिक्स', 'discipline' => 'Shot Put', 'gender_class' => 'M'],
                    ['name' => 'ऊंची कूद', 'sport' => 'एथलेटिक्स', 'discipline' => 'High Jump', 'gender_class' => 'OPEN'],
                ],
            ],
            [
                'name' => 'उ.प्र. पुलिस कबड्डी चैम्पियनशिप',
                'tier' => 'OTHER',
                'sport' => 'कबड्डी',
                'venue' => null,
                'date_from' => null,
                'date_to' => null,
                'raw_date_text' => 'मार्च '.($startYear + 1),
                'events' => [],
            ],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($definitions as $def) {
            $tier = $tiers->get($def['tier']);

            if ($tier === null) {
                continue;
            }

            $sportId = $def['sport'] !== null ? ($sports[$def['sport']] ?? null) : null;

            $tournament = Tournament::withoutGlobalScopes()->firstOrCreate(
                [
                    'organization_id' => $orgId,
                    'session_id' => $session->id,
                    'name' => $def['name'],
                ],
                [
                    'tier_id' => $tier->id,
                    'sport_id' => $sportId,
                    'venue' => $def['venue'],
                    'date_from' => $def['date_from'],
                    'date_to' => $def['date_to'],
                    'raw_date_text' => $def['raw_date_text'],
                ],
            );

            if ($tournament->wasRecentlyCreated) {
                $created++;

                foreach ($def['events'] as $eventDef) {
                    $evSportId = ($sports[$eventDef['sport']] ?? null) ?? $sportId;

                    if ($evSportId === null) {
                        continue;
                    }

                    Event::create([
                        'tournament_id' => $tournament->id,
                        'sport_id' => $evSportId,
                        'name' => $eventDef['name'],
                        'discipline' => $eventDef['discipline'] ?? null,
                        'weight_category' => $eventDef['weight_category'] ?? null,
                        'gender_class' => $eventDef['gender_class'],
                    ]);
                }
            } else {
                $skipped++;
            }
        }

        $this->command->info("TournamentSeeder: {$created} created, {$skipped} skipped.");
    }
}
