<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\Seeder;

/**
 * Seeds Team records by parsing team-group header rows from the
 * GD and sports quota player CSV exports.
 *
 * A "team header" row is one where every cell repeats the same text,
 * starting with "उ.प्र. पुलिस".  The format is:
 *   उ.प्र. पुलिस <sport> टीम <unit-description>
 *
 * Run order: after MemberSeeder (sport, session, and unit tables must exist).
 */
class TeamSeeder extends Seeder
{
    /**
     * Canonical sport name overrides for Hindi variants used in CSV headers.
     * Key = raw CSV sport text (lowercased, spaces normalised).
     * Value = name_hi in the sports table.
     *
     * @var array<string, string>
     */
    private const SPORT_ALIAS = [
        'वुशू' => 'वुशु',
        'ताइक्वाण्डो' => 'ताईक्वांडो',
        'ताइक्वाण्डो/फेंशिंग' => 'ताईक्वांडो',
        'फेंशिंग' => 'फेंसिंग',
        'पावरलिफ्टिंग' => 'पावर लिफ्टिंग',
        'क्रॉसकन्ट्री' => 'क्रॉस कंट्री',
        'बॉडीविल्डिंग' => 'बॉडी बिल्डिंग',
        'वॉलीबाल' => 'वॉलीबॉल',
        'साइक्लिंग' => 'साइकिलिंग',
        'बैडमिन्टन' => 'बैडमिंटन',
        'बास्केटवाल' => 'बास्केटबॉल',
        'शूटिंग ड्यूटीमीट' => 'शूटिंग',
        'सेपक टेकरा' => 'सेपक टकरा',
        'आर्म रेसलिंग' => 'आर्म रेसलिंग',
        'एससीबी जिम' => 'बॉडी बिल्डिंग',
        'हैण्डबॉल' => 'हैंडबॉल',
        'क्रासकन्ट्री' => 'क्रॉस कंट्री',
        'वाटरस्पोर्ट्स' => 'वाटर स्पोर्ट्स',
    ];

    public function run(): void
    {
        $org = Organization::firstOrFail();

        $session = SportSession::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('is_current', true)
            ->first();

        if (! $session) {
            $this->command->warn('TeamSeeder: no current SportSession found, skipping.');

            return;
        }

        /** @var array<string, int> $sportMap name_hi → id */
        $sportMap = Sport::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name_hi')
            ->all();

        /** @var array<string, int> $unitMap name_hi → id */
        $unitMap = Unit::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name_hi')
            ->all();

        $sources = [
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/GD_KHILADI.csv'),
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/KUSHAL_KHILADI.csv'),
        ];

        $headers = [];

        foreach ($sources as $csvPath) {
            if (! file_exists($csvPath)) {
                $this->command->warn("TeamSeeder: {$csvPath} not found, skipping.");

                continue;
            }

            $handle = fopen($csvPath, 'r');

            if ($handle === false) {
                continue;
            }

            while (($row = fgetcsv($handle)) !== false) {
                if (empty($row) || count($row) < 2) {
                    continue;
                }

                $first = trim($row[0]);
                $second = trim($row[1]);

                // Team header: all cells repeat the same long text starting
                // with "उ.प्र. पुलिस".
                if (
                    $first === $second
                    && strlen($first) > 10
                    && str_starts_with($first, 'उ.प्र. पुलिस')
                ) {
                    $headers[$first] = true;
                }
            }

            fclose($handle);
        }

        $created = 0;
        $skipped = 0;

        foreach (array_keys($headers) as $header) {
            [$sportRaw, $unitRaw] = $this->parseHeader($header);

            if ($sportRaw === null || $unitRaw === null) {
                $skipped++;

                continue;
            }

            $sportId = $this->resolveSport($sportRaw, $sportMap);
            $unitId = $this->resolveUnit($unitRaw, $unitMap);

            if ($sportId === null || $unitId === null) {
                $skipped++;

                continue;
            }

            Team::withoutGlobalScopes()->firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'sport_id' => $sportId,
                    'session_id' => $session->id,
                    'unit_id' => $unitId,
                    'name_hi' => $header,
                ],
                ['in_charge_hi' => null],
            );

            $created++;
        }

        $this->command->info("TeamSeeder: created {$created} teams, skipped {$skipped} (sport/unit not resolved).");
    }

    /**
     * Extract [sport_raw, unit_raw] from a team header string.
     * Returns [null, null] if the header doesn't match the expected pattern.
     *
     * @return array{0: string|null, 1: string|null}
     */
    private function parseHeader(string $header): array
    {
        // Pattern: "उ.प्र. पुलिस <sport> टीम <unit>"
        // The sport name may include gender qualifiers like "(पुरूष)" or "(महिला)".
        if (! preg_match('/^उ\.प्र\. पुलिस (.+?) टीम (.+)$/u', $header, $m)) {
            return [null, null];
        }

        return [trim($m[1]), trim($m[2])];
    }

    /**
     * Resolve sport_id, applying CSV-variant aliases.
     *
     * @param  array<string, int>  $sportMap
     */
    private function resolveSport(string $raw, array $sportMap): ?int
    {
        // Strip gender qualifier: "कबड्डी (पुरूष)" → "कबड्डी".
        $bare = trim((string) preg_replace('/\s*\([^)]*\)\s*/u', '', $raw));

        $candidates = array_unique([$raw, $bare, self::SPORT_ALIAS[$raw] ?? null, self::SPORT_ALIAS[$bare] ?? null]);

        foreach ($candidates as $candidate) {
            if ($candidate !== null && isset($sportMap[$candidate])) {
                return $sportMap[$candidate];
            }
        }

        // Partial match: check if any sport name is contained in the raw.
        foreach ($sportMap as $name => $id) {
            if (str_contains($bare, $name) || str_contains($name, $bare)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Resolve unit_id from the team-header unit portion.
     *
     * @param  array<string, int>  $unitMap
     */
    private function resolveUnit(string $raw, array $unitMap): ?int
    {
        if (isset($unitMap[$raw])) {
            return $unitMap[$raw];
        }

        foreach ($unitMap as $name => $id) {
            if (str_contains($raw, $name) || str_contains($name, $raw)) {
                return $id;
            }
        }

        // Try numeric battalion prefix: "06 BN PAC मेरठ" → match "06" in unit names.
        if (preg_match('/^(\d+)\s+BN\s+PAC\s+(.+)$/u', $raw, $m)) {
            $num = ltrim($m[1], '0') ?: '0';
            $city = trim($m[2]);

            foreach ($unitMap as $name => $id) {
                // Match by battalion number embedded in the Hindi name.
                if (str_contains($name, $num.'वीं') && str_contains($name, $city)) {
                    return $id;
                }

                if (str_contains($name, $num.'वां') && str_contains($name, $city)) {
                    return $id;
                }
            }
        }

        return null;
    }
}
