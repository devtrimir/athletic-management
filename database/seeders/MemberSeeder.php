<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\District;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Unit;
use App\Services\MemberCodeGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seeds real UP Police member data from the GD and sports quota player CSV exports.
 *
 * Sources:
 *   analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/GD_KHILADI.csv
 *   analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/KUSHAL_KHILADI.csv
 *
 * Run order: after UnitSeeder and DistrictSeeder.
 */
class MemberSeeder extends Seeder
{
    /**
     * Female rank prefixes — these indicate gender=F when the name starts
     * with one of these strings.
     */
    private const FEMALE_PREFIXES = [
        'म.मु.आ.', 'म.मु. आरक्षी', 'म.मु.आरक्षी', 'म0मु0आ0',
        'म.मु.आ', 'म.आ.', 'म0आ0', 'म.आरक्षी', 'म आरक्षी',
        'म.आ', 'म0आ0', 'मआ', 'महिला', 'कु.',
    ];

    /**
     * Rank prefix patterns in precedence order: [regex, rank_value].
     * Patterns are tried top-to-bottom; first match wins.
     *
     * @var list<array{0: string, 1: string}>
     */
    private const RANK_PATTERNS = [
        ['/^(म\.मु\.आ\.|म0मु0आ0|म\.मु\. आरक्षी|म\.मु\.आरक्षी)\s*/u', 'Head Constable'],
        ['/^(मु\.आ\.|मु0आ0|मु\.आरक्षी|मुख्य आरक्षी)\s*/u', 'Head Constable'],
        ['/^(म\.आ\.|म0आ0|म\.आरक्षी|म आरक्षी)\s*/u', 'Constable'],
        ['/^(उ\.नि\.|उ0नि0|उपनिरीक्षक)\s*/u', 'SI'],
        ['/^(निरीक्षक|Inspector)\s*/u', 'Inspector'],
        ['/^दलनायक\s*/u', 'Inspector'],
        ['/^(पी\.सी\.|पी0सी0|पीसी|आरक्षी ना\.पु\.|आरक्षी|आ\.\s*(?:एपी|चालक|आरमोरर)?|आ0\s*(?:एपी|चा0|चालक)?|पीसी|आ\.)\s*/u', 'Constable'],
        ['/^कु\.\s*/u', 'Constable'],
    ];

    /**
     * Player level keyword → enum value.
     *
     * @var array<string, string>
     */
    private const LEVEL_MAP = [
        'अन्तर्राष्ट्रीय' => 'INTERNATIONAL',
        'अंतर्राष्ट्रीय' => 'INTERNATIONAL',
        'राष्ट्रीय' => 'NATIONAL',
        'अखिल भारतीय पुलिस' => 'AIPSC',
        'जोन' => 'ZONAL',
        'उ.प्र. पुलिस' => 'ZONAL',
        'उ0प्र0' => 'ZONAL',
        'यू0पी0' => 'ZONAL',
        'यूपी' => 'ZONAL',
    ];

    public function run(): void
    {
        $org = Organization::firstOrFail();

        /** @var array<string, int> $districtMap */
        $districtMap = District::query()
            ->pluck('id', 'name')
            ->all();

        /** @var array<string, int> $unitMap */
        $unitMap = Unit::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name')
            ->all();

        $sources = [
            ['path' => base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/GD_KHILADI.csv'), 'category' => 'GD'],
            ['path' => base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/KUSHAL_KHILADI.csv'), 'category' => 'SPORTS_QUOTA'],
        ];

        /** @var list<array<string, mixed>> $pending */
        $pending = [];

        foreach ($sources as ['path' => $csvPath, 'category' => $category]) {
            if (! file_exists($csvPath)) {
                $this->command->warn("MemberSeeder: {$csvPath} not found, skipping.");

                continue;
            }

            $handle = fopen($csvPath, 'r');

            if ($handle === false) {
                $this->command->warn("MemberSeeder: cannot open {$csvPath}, skipping.");

                continue;
            }

            $this->parseFile($handle, $category, $org->id, $districtMap, $unitMap, $pending);
            fclose($handle);
        }

        if (empty($pending)) {
            $this->command->warn('MemberSeeder: no valid rows found.');

            return;
        }

        // Deduplicate by PNO (keep last occurrence — KUSHAL overrides GD if same person).
        $byPno = [];
        $noPno = [];

        foreach ($pending as $row) {
            if ($row['pno'] !== null) {
                $byPno[$row['pno']] = $row;
            } else {
                $noPno[] = $row;
            }
        }

        $deduped = array_values(array_merge(array_values($byPno), $noPno));

        // Generate member codes for all new records in one batch.
        $generator = app(MemberCodeGenerator::class);
        $codes = $generator->nextBatch($org->id, count($deduped), 2026);

        foreach ($deduped as $i => $row) {
            $deduped[$i]['member_code'] = $codes[$i];
        }

        // Upsert by (organization_id, pno) for rows with PNO; plain insert otherwise.
        $withPno = array_filter($deduped, fn ($r) => $r['pno'] !== null);
        $withoutPno = array_filter($deduped, fn ($r) => $r['pno'] === null);

        DB::transaction(function () use ($withPno, $withoutPno): void {
            foreach ($withPno as $row) {
                Member::withoutGlobalScopes()->updateOrCreate(
                    ['organization_id' => $row['organization_id'], 'pno' => $row['pno']],
                    $row,
                );
            }

            foreach ($withoutPno as $row) {
                Member::withoutGlobalScopes()->firstOrCreate(
                    ['organization_id' => $row['organization_id'], 'full_name' => $row['full_name'], 'player_category' => $row['player_category']],
                    $row,
                );
            }
        });

        $this->command->info('MemberSeeder: upserted '.count($deduped).' members ('.count($withPno).' by PNO, '.count($withoutPno).' by name).');
    }

    /**
     * Parse a single CSV file into the $pending list.
     *
     * @param  resource  $handle
     * @param  array<string, int>  $districtMap
     * @param  array<string, int>  $unitMap
     * @param  list<array<string, mixed>>  $pending
     */
    private function parseFile(
        mixed $handle,
        string $category,
        int $orgId,
        array $districtMap,
        array $unitMap,
        array &$pending,
    ): void {
        while (($row = fgetcsv($handle)) !== false) {
            if (empty($row)) {
                continue;
            }

            // Pad to at least 10 columns.
            while (count($row) < 10) {
                $row[] = '';
            }

            $first = trim($row[0]);

            // Detect meta/header rows.
            // (a) Column header: first cell is the serial label.
            if ($first === 'क्र.सं.' || $first === 'क्र.सं') {
                continue;
            }

            // (b) Title/team-header: first cell equals second cell and the
            //     value is a long non-numeric string (all cells repeated).
            if (
                trim($row[1]) === $first
                && strlen($first) > 10
                && ! is_numeric($first)
            ) {
                // This is a repeated-header row (title or team header) — skip it.
                continue;
            }

            // Data row: must have a name in col[3] that contains Devanagari.
            $rawName = trim($row[3]);

            if (empty($rawName) || ! preg_match('/[\x{0900}-\x{097F}]/u', $rawName)) {
                continue;
            }

            // PNO — standard col[2] or embedded in col[2] for fencing section.
            $rawPno = trim($row[2]);
            $pno = $this->extractPno($rawPno, $rawName);

            // Skip rows with only Krutidev or garbage in the name field.
            if (! $this->isDevanagari($rawName)) {
                continue;
            }

            $gender = $this->detectGender($rawName);
            $rank = $this->detectRank($rawName);
            $cleanName = $this->cleanName($rawName);

            // For fencing-style mixed cells, use cleaned name from col[2] if col[3] was empty.
            if (empty($cleanName) && preg_match('/[\x{0900}-\x{097F}]/u', $rawPno)) {
                $cleanName = $this->cleanName($rawPno);
            }

            if (empty($cleanName)) {
                continue;
            }

            $posting = trim($row[4]);
            $homeDistrict = trim($row[5]);
            $dobRaw = trim($row[6]);
            $joiningRaw = trim($row[7]);
            $mobile = preg_replace('/\D/', '', trim($row[8])) ?: null;
            $levelRaw = trim($row[9]);

            // Validate mobile: must be 10 digits.
            if ($mobile !== null && strlen($mobile) !== 10) {
                $mobile = null;
            }

            $pending[] = [
                'organization_id' => $orgId,
                'member_code' => '', // filled after batch code generation
                'pno' => $pno,
                'full_name' => $cleanName,
                'full_name_normalized' => null,
                'father_name' => null,
                'rank' => $rank,
                'gender' => $gender,
                'dob' => $this->parseDate($dobRaw),
                'joining_date' => $this->parseDate($joiningRaw),
                'mobile' => $mobile,
                'home_district_id' => $this->resolveDistrict($homeDistrict, $districtMap),
                'posting_district_id' => $this->resolveDistrict($posting, $districtMap),
                'current_unit_id' => $this->resolveUnit($posting, $unitMap),
                'player_category' => $category,
                'player_level' => $this->resolveLevel($levelRaw),
                'current_status' => 'ACTIVE',
                'sport_event' => trim($row[1]) ?: null,
                'source_refs' => null,
                'photo_path' => null,
                'blood_group' => null,
                'caste' => null,
                'promotion_date' => null,
                'initial_rank' => null,
                'appointment' => null,
                'home_address' => null,
                'recruitment_type' => 'SPORTS_QUOTA',
                'other_notes' => null,
                'team_since' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
    }

    /**
     * Extract a 8–12 digit PNO from the raw value.
     * Handles both clean numeric PNOs and fencing-style mixed fields.
     */
    private function extractPno(string $rawPno, string $rawName): ?string
    {
        // Standard: numeric-only cell.
        if (preg_match('/^\d{8,12}$/', $rawPno)) {
            return $rawPno;
        }

        // Mixed cell (fencing): contains Devanagari + digits.
        if (preg_match('/\b(\d{8,12})\b/', $rawPno, $m)) {
            return $m[1];
        }

        // Fallback: look in name field.
        if (preg_match('/\b(\d{8,12})\b/', $rawName, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Return true if the string contains at least one Devanagari character.
     */
    private function isDevanagari(string $s): bool
    {
        return (bool) preg_match('/[\x{0900}-\x{097F}]/u', $s);
    }

    /**
     * Detect gender from rank prefix in the raw name cell.
     * Female officers carry a feminine rank abbreviation prefix.
     */
    private function detectGender(string $rawName): string
    {
        foreach (self::FEMALE_PREFIXES as $prefix) {
            if (str_starts_with($rawName, $prefix)) {
                return 'F';
            }
        }

        return 'M';
    }

    /**
     * Detect rank from the name prefix. Returns null when unrecognisable.
     */
    private function detectRank(string $rawName): ?string
    {
        foreach (self::RANK_PATTERNS as [$pattern, $rank]) {
            if (preg_match($pattern, $rawName)) {
                return $rank;
            }
        }

        return null;
    }

    /**
     * Strip rank prefix, PNO embedded in name, appointment suffix, and
     * "श्री " / "श्रीमती " honorifics. Returns the bare Hindi name.
     */
    private function cleanName(string $raw): string
    {
        // Take only the first line (appointment suffix follows a newline).
        $raw = explode("\n", $raw)[0];

        // Remove embedded PNO.
        $raw = preg_replace('/\b\d{8,12}\b/', '', $raw) ?? $raw;

        // Remove rank prefixes.
        foreach (self::RANK_PATTERNS as [$pattern]) {
            $raw = preg_replace($pattern, '', $raw) ?? $raw;
        }

        // Remove honorifics.
        $raw = preg_replace('/^(श्री|श्रीमती|कु\.)\s*/u', '', $raw) ?? $raw;

        // Remove parenthetical notes like (पुरूष टीम), (NIS), etc.
        $raw = preg_replace('/\s*\([^)]*\)\s*/u', ' ', $raw) ?? $raw;

        return trim($raw);
    }

    /**
     * Parse a date string in DD.MM.YYYY or ISO 8601 format.
     * Returns null when the string is empty or unparseable.
     */
    private function parseDate(string $value): ?string
    {
        $value = trim($value);

        if (empty($value)) {
            return null;
        }

        if (preg_match('/^\d{1,2}\.\d{1,2}\.\d{4}$/', $value)) {
            try {
                return Carbon::createFromFormat('d.m.Y', $value)->toDateString();
            } catch (\Exception) {
                return null;
            }
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
            try {
                return Carbon::parse($value)->toDateString();
            } catch (\Exception) {
                return null;
            }
        }

        return null;
    }

    /**
     * Resolve district_id from the raw home-district string.
     *
     * @param  array<string, int>  $districtMap
     */
    private function resolveDistrict(string $raw, array $districtMap): ?int
    {
        $raw = trim($raw);

        if (empty($raw)) {
            return null;
        }

        // Exact match first.
        if (isset($districtMap[$raw])) {
            return $districtMap[$raw];
        }

        // Partial match: check if any district name is contained in the raw
        // value or vice versa (handles "कानपुर नगर" vs "कानपुर").
        foreach ($districtMap as $name => $id) {
            if (str_contains($raw, $name) || str_contains($name, $raw)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Resolve unit_id from the posting-location string.
     *
     * @param  array<string, int>  $unitMap
     */
    private function resolveUnit(string $raw, array $unitMap): ?int
    {
        $raw = trim($raw);

        if (empty($raw)) {
            return null;
        }

        // Exact match.
        if (isset($unitMap[$raw])) {
            return $unitMap[$raw];
        }

        // Partial match: PAC battalion numbers match reliably.
        foreach ($unitMap as $name => $id) {
            if (str_contains($raw, $name) || str_contains($name, $raw)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Map a raw player-level string to the enum value.
     * Defaults to ZONAL when no keyword matches.
     */
    private function resolveLevel(string $raw): string
    {
        foreach (self::LEVEL_MAP as $keyword => $level) {
            if (str_contains($raw, $keyword)) {
                return $level;
            }
        }

        return 'ZONAL';
    }
}
