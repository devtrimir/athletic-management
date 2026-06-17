<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\Seeder;

/**
 * Seeds real UP Police coach data from COACH.csv.
 *
 * Each COACH.csv row contains a head coach (col[3]/col[4]) and optionally an
 * assistant coach (col[5]/col[6]).  Both are created as Coach records and
 * assigned to their team via coach_assignments.
 *
 * Source: analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/COACH.csv
 */
class CoachSeeder extends Seeder
{
    /**
     * Sport name aliases: COACH.csv variant → canonical name in sports table.
     *
     * @var array<string, string>
     */
    private const SPORT_ALIAS = [
        'वुशू' => 'वुशु',
        'ताइक्वाण्डो' => 'ताईक्वांडो',
        'ताइक्वाण्डो/फेंशिंग' => 'ताईक्वांडो',
        'फेंशिंग' => 'फेंसिंग',
        'पावरलिफ्टिंग' => 'पावर लिफ्टिंग',
        'बॉडीविल्डिंग' => 'बॉडी बिल्डिंग',
        'वाटरस्पोर्टस' => 'तैराकी',
        'वाटर स्पोर्ट्स' => 'तैराकी',
        'बैडमिन्टन' => 'बैडमिंटन',
        'बैडमिन्टन (पु)' => 'बैडमिंटन',
        'बैडमिन्टन (म.)' => 'बैडमिंटन',
        'बास्केटवाल' => 'बास्केटबॉल',
        'बास्केटवाल \n(महिला)' => 'बास्केटबॉल',
        'कबड्डी (पुरूष)' => 'कबड्डी',
        'कबड्डी (महिला)' => 'कबड्डी',
        'साइक्लिंग' => 'साइकिलिंग',
        'SCB GYM' => 'बॉडी बिल्डिंग',
    ];

    /**
     * Rank prefix patterns (same as MemberSeeder) for stripping from name.
     */
    private const RANK_PATTERNS = [
        '/^(उ\.नि\.|उ0नि0|उपनिरीक्षक)\s*/u',
        '/^(निरीक्षक|Inspector)\s*/u',
        '/^दलनायक\s*/u',
        '/^(मु\.आ\.|मु0आ0|मु\.आरक्षी|मुख्य आरक्षी)\s*/u',
        '/^(म\.मु\.आ\.|म0मु0आ0|म\.मु\. आरक्षी|म\.मु\.आरक्षी)\s*/u',
        '/^(म\.आ\.|म0आ0|म\.आरक्षी|म आरक्षी)\s*/u',
        '/^(पी\.सी\.|पी0सी0|पीसी|पीसी\s*|PC\s*|HCIP\s*)\s*/u',
        '/^(आरक्षी ना\.पु\.|आरक्षी|आ\.\s*(?:एपी|चालक|आरमोरर)?|आ0\s*(?:एपी|चा0|चालक)?|आ0)\s*/u',
        '/^(आरमोरर|सी\.सी\.)\s*/u',
        '/^(ना\.पु\.|ना0पु0|एपी)\s*/u',
    ];

    public function run(): void
    {
        $org = Organization::first();

        if (! $org) {
            return;
        }

        $csvPath = base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/COACH.csv');

        if (! file_exists($csvPath)) {
            $this->command->warn('CoachSeeder: COACH.csv not found, falling back to factory fixtures.');
            $this->seedFromFactory($org->id);

            return;
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            $this->command->warn('CoachSeeder: cannot open COACH.csv, falling back to factory fixtures.');
            $this->seedFromFactory($org->id);

            return;
        }

        $session = SportSession::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('is_current', true)
            ->first();

        /** @var array<string, int> $sportMap name → id */
        $sportMap = Sport::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name')
            ->all();

        /** @var array<string, int> $unitMap name → id */
        $unitMap = Unit::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name')
            ->all();

        $coachCreated = 0;
        $assignmentsCreated = 0;
        $rowIndex = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowIndex++;

            // Skip header row.
            if ($rowIndex === 1) {
                continue;
            }

            if (count($row) < 4) {
                continue;
            }

            $unitRaw = trim(explode("\n", trim($row[1]))[0]);
            $sportRaw = trim($row[2]);

            // Resolve team once per row.
            $teamId = $session !== null
                ? $this->resolveTeam($unitRaw, $sportRaw, $sportMap, $unitMap, $session->id, $org->id)
                : null;

            // Head coach — col[3] / col[4].
            $headCoachId = $this->seedCoach(
                raw: trim($row[3]),
                mobileRaw: trim($row[4] ?? ''),
                orgId: $org->id,
                coachCreated: $coachCreated,
            );

            if ($headCoachId !== null && $teamId !== null && $session !== null) {
                $this->upsertAssignment($teamId, $headCoachId, $session->id, 'HEAD');
                $assignmentsCreated++;
            }

            // Assistant coach — col[5] / col[6].
            $assistantRaw = trim($row[5] ?? '');

            if (! empty($assistantRaw) && $assistantRaw !== '-') {
                $assistCoachId = $this->seedCoach(
                    raw: $assistantRaw,
                    mobileRaw: trim($row[6] ?? ''),
                    orgId: $org->id,
                    coachCreated: $coachCreated,
                );

                if ($assistCoachId !== null && $teamId !== null && $session !== null) {
                    $this->upsertAssignment($teamId, $assistCoachId, $session->id, 'ASSISTANT');
                    $assignmentsCreated++;
                }
            }
        }

        fclose($handle);

        $this->command->info("CoachSeeder: seeded {$coachCreated} coaches, {$assignmentsCreated} assignments from COACH.csv.");
    }

    /**
     * Parse the raw coach name field, create/update the Coach record, and
     * return the coach id.  Returns null when the field is empty or invalid.
     */
    private function seedCoach(string $raw, string $mobileRaw, int $orgId, int &$coachCreated): ?int
    {
        if (empty($raw) || $raw === '-') {
            return null;
        }

        ['name' => $name, 'pno' => $pno, 'nis' => $nis] = $this->parseCoachField($raw);

        if (empty($name)) {
            return null;
        }

        $mobile = preg_replace('/\D/', '', $mobileRaw) ?: null;

        if ($mobile !== null && strlen($mobile) !== 10) {
            preg_match('/\b(\d{10})\b/', $mobileRaw, $m);
            $mobile = $m[1] ?? null;
        }

        $memberId = null;

        if ($pno !== null) {
            $memberId = Member::withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('pno', $pno)
                ->value('id');
        }

        // Use a synthetic unique key when PNO is absent.
        $uniqueKey = $pno ?? ('name:'.$name);

        $coach = Coach::withoutGlobalScopes()->updateOrCreate(
            ['organization_id' => $orgId, 'pno' => $pno ?? $uniqueKey],
            [
                'organization_id' => $orgId,
                'member_id' => $memberId,
                'full_name' => $name,
                'pno' => $pno,
                'mobile' => $mobile,
                'nis_certified' => $nis,
            ],
        );

        if ($coach->wasRecentlyCreated) {
            $coachCreated++;
        }

        return $coach->id;
    }

    /**
     * Resolve team_id from a training-site text (col[1]) and sport name (col[2]).
     *
     * @param  array<string, int>  $sportMap
     * @param  array<string, int>  $unitMap
     */
    private function resolveTeam(
        string $unitRaw,
        string $sportRaw,
        array $sportMap,
        array $unitMap,
        int $sessionId,
        int $orgId,
    ): ?int {
        $sportId = $this->resolveSport($sportRaw, $sportMap);
        $unitId = $this->resolveUnit($unitRaw, $unitMap);

        if ($sportId === null || $unitId === null) {
            return null;
        }

        return Team::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('session_id', $sessionId)
            ->where('sport_id', $sportId)
            ->where('unit_id', $unitId)
            ->value('id');
    }

    /**
     * Resolve sport_id, applying variant aliases and stripping gender qualifiers.
     *
     * @param  array<string, int>  $sportMap
     */
    private function resolveSport(string $raw, array $sportMap): ?int
    {
        $bare = trim((string) preg_replace('/\s*\([^)]*\)\s*/u', '', $raw));

        foreach ([$raw, $bare, self::SPORT_ALIAS[$raw] ?? null, self::SPORT_ALIAS[$bare] ?? null] as $candidate) {
            if ($candidate !== null && isset($sportMap[$candidate])) {
                return $sportMap[$candidate];
            }
        }

        foreach ($sportMap as $name => $id) {
            if (str_contains($bare, $name) || str_contains($name, $bare)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Resolve unit_id by partial match against the training-site text.
     *
     * @param  array<string, int>  $unitMap
     */
    private function resolveUnit(string $raw, array $unitMap): ?int
    {
        if (isset($unitMap[$raw])) {
            return $unitMap[$raw];
        }

        // Extract numeric battalion number from patterns like "06वीं वाहिनी मेरठ".
        foreach ($unitMap as $name => $id) {
            if (str_contains($raw, $name) || str_contains($name, $raw)) {
                return $id;
            }
        }

        // Fuzzy: compare keywords — battalion number + city name.
        if (preg_match('/(\d+)(?:वीं|वां|वां)?\s*वाहिनी\s+(.+)/u', $raw, $m)) {
            $num = ltrim($m[1], '0') ?: '0';
            $city = trim($m[2]);

            foreach ($unitMap as $name => $id) {
                if (str_contains($name, $num.'वीं') && str_contains($name, $city)) {
                    return $id;
                }
            }
        }

        return null;
    }

    /**
     * Upsert a coach_assignment record.
     */
    private function upsertAssignment(int $teamId, int $coachId, int $sessionId, string $role): void
    {
        CoachAssignment::query()->updateOrCreate(
            [
                'team_id' => $teamId,
                'coach_id' => $coachId,
                'session_id' => $sessionId,
                'role' => $role,
            ],
            [
                'is_current' => true,
                'assigned_at' => now(),
                'removed_at' => null,
                'notes' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    /**
     * Parse the coach name field which may contain a rank abbreviation, PNO,
     * and an appointment suffix on a second line.
     *
     * @return array{name: string, pno: string|null, nis: bool}
     */
    private function parseCoachField(string $raw): array
    {
        $firstLine = explode("\n", $raw)[0];
        $nis = str_contains(strtoupper($raw), 'NIS');

        $pno = null;

        if (preg_match('/\b(\d{8,12})\b/', $firstLine, $m)) {
            $pno = $m[1];
            $firstLine = str_replace($m[0], '', $firstLine);
        }

        foreach (self::RANK_PATTERNS as $pattern) {
            $firstLine = preg_replace($pattern, '', $firstLine) ?? $firstLine;
        }

        $firstLine = preg_replace('/^(श्री|श्रीमती|कु\.)\s*/u', '', $firstLine) ?? $firstLine;
        $firstLine = preg_replace('/\s*\([^)]*\)\s*/u', ' ', $firstLine) ?? $firstLine;

        $name = trim($firstLine);

        if (empty($name) || ! preg_match('/[\x{0900}-\x{097F}]/u', $name)) {
            $name = '';
        }

        return ['name' => $name, 'pno' => $pno, 'nis' => $nis];
    }

    /**
     * Factory fallback — produces generic development fixtures.
     */
    private function seedFromFactory(int $orgId): void
    {
        Coach::factory()
            ->count(5)
            ->standalone()
            ->create(['organization_id' => $orgId]);

        Coach::factory()
            ->count(3)
            ->standalone()
            ->nisCertified()
            ->create(['organization_id' => $orgId]);

        $members = Member::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->inRandomOrder()
            ->limit(6)
            ->get();

        if ($members->isNotEmpty()) {
            foreach ($members as $member) {
                Coach::factory()
                    ->withMember($member)
                    ->create(['organization_id' => $orgId]);
            }
        } else {
            Coach::factory()
                ->count(6)
                ->withMember()
                ->create(['organization_id' => $orgId]);
        }

        Coach::factory()
            ->count(4)
            ->nisCertified()
            ->withMember()
            ->create(['organization_id' => $orgId]);
    }
}
