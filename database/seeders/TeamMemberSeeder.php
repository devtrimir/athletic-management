<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Member;
use App\Models\Organization;
use App\Models\SportSession;
use App\Models\Team;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Assigns players to their teams by re-parsing the GD and Skilled player
 * CSVs and mapping each data row to the team header that precedes it.
 *
 * Run order: after MemberSeeder and TeamSeeder.
 */
class TeamMemberSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::firstOrFail();

        $session = SportSession::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('is_current', true)
            ->firstOrFail();

        /** @var array<string, int> $teamMap  name_hi → id */
        $teamMap = Team::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->where('session_id', $session->id)
            ->pluck('id', 'name_hi')
            ->all();

        /** @var array<string, int> $memberMap  pno → id */
        $memberMap = Member::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->whereNotNull('pno')
            ->pluck('id', 'pno')
            ->all();

        $sources = [
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/GD_KHILADI.csv'),
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/KUSHAL_KHILADI.csv'),
        ];

        /** @var list<array{team_id: int, member_id: int}> $assignments */
        $assignments = [];

        $seen = [];

        foreach ($sources as $csvPath) {
            if (! file_exists($csvPath)) {
                $this->command->warn("TeamMemberSeeder: {$csvPath} not found, skipping.");

                continue;
            }

            $handle = fopen($csvPath, 'r');

            if ($handle === false) {
                continue;
            }

            $currentTeamId = null;

            while (($row = fgetcsv($handle)) !== false) {
                if (empty($row)) {
                    continue;
                }

                while (count($row) < 10) {
                    $row[] = '';
                }

                $first = trim($row[0]);
                $second = trim($row[1]);

                // Column header row — skip.
                if ($first === 'क्र.सं.' || $first === 'क्र.सं') {
                    continue;
                }

                // Team-header row: all cells repeat the same long text.
                if ($first === $second && strlen($first) > 10 && ! is_numeric($first)) {
                    // Exact lookup first; then partial match.
                    $currentTeamId = $teamMap[$first] ?? $this->partialTeamLookup($first, $teamMap);

                    continue;
                }

                if ($currentTeamId === null) {
                    continue;
                }

                // Data row: need a Devanagari name in col[3].
                $rawName = trim($row[3]);

                if (empty($rawName) || ! preg_match('/[\x{0900}-\x{097F}]/u', $rawName)) {
                    continue;
                }

                // Extract PNO from col[2].
                $rawPno = trim($row[2]);
                $pno = $this->extractPno($rawPno, $rawName);

                if ($pno === null || ! isset($memberMap[$pno])) {
                    continue;
                }

                $memberId = $memberMap[$pno];
                $key = "{$currentTeamId}:{$memberId}";

                if (isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;

                $assignments[] = [
                    'team_id' => $currentTeamId,
                    'member_id' => $memberId,
                    'session_id' => $session->id,
                    'role' => 'PLAYER',
                    'joined_on' => null,
                    'left_on' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            fclose($handle);
        }

        if (empty($assignments)) {
            $this->command->warn('TeamMemberSeeder: no assignments resolved.');

            return;
        }

        // Insert in chunks to stay within MySQL packet limits.
        foreach (array_chunk($assignments, 200) as $chunk) {
            DB::table('team_members')->upsert(
                $chunk,
                uniqueBy: ['team_id', 'member_id'],
                update: ['role', 'session_id', 'updated_at'],
            );
        }

        $this->command->info('TeamMemberSeeder: assigned '.count($assignments).' players to teams.');
    }

    /**
     * Partial lookup: find a team whose name_hi contains or is contained in
     * the given header text (handles minor whitespace / encoding differences).
     *
     * @param  array<string, int>  $teamMap
     */
    private function partialTeamLookup(string $header, array $teamMap): ?int
    {
        foreach ($teamMap as $name => $id) {
            if (str_contains($header, $name) || str_contains($name, $header)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Extract a 8–12 digit PNO from the raw cell value.
     */
    private function extractPno(string $rawPno, string $rawName): ?string
    {
        if (preg_match('/^\d{8,12}$/', $rawPno)) {
            return $rawPno;
        }

        if (preg_match('/\b(\d{8,12})\b/', $rawPno, $m)) {
            return $m[1];
        }

        if (preg_match('/\b(\d{8,12})\b/', $rawName, $m)) {
            return $m[1];
        }

        return null;
    }
}
