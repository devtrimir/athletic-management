<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Member;
use App\Models\Organization;
use App\Models\Sport;
use App\Models\Unit;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('members:sync-sport-events {--member= : Sync a single member id, PNO, or member code instead of the full dataset} {--source= : Comma-separated CSV source override} {--dry-run : Show what would change without writing}')]
#[Description('Backfill member sport-event data from the legacy CSV exports into the associated member_sport pivot table')]
class SyncMemberSportEvents extends Command
{
    /**
     * Run the command.
     */
    public function handle(): int
    {
        $org = Organization::first();

        if ($org === null) {
            $this->warn('No organization found.');

            return self::SUCCESS;
        }

        $memberFilter = trim((string) $this->option('member'));
        $dryRun = (bool) $this->option('dry-run');

        /** @var array<string, int> $sportMap */
        $sportMap = Sport::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name_hi')
            ->all();

        /** @var array<string, int> $unitMap */
        $unitMap = Unit::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->pluck('id', 'name_hi')
            ->all();

        $matchedMembers = [];
        $updatedMembers = 0;
        $skippedRows = 0;
        $sourceRows = 0;

        foreach ($this->sourcePaths() as $relativePath) {
            $csvPath = str_starts_with($relativePath, DIRECTORY_SEPARATOR)
                ? $relativePath
                : base_path($relativePath);

            if (! file_exists($csvPath)) {
                $this->warn("{$relativePath} not found, skipping.");

                continue;
            }

            $handle = fopen($csvPath, 'r');

            if ($handle === false) {
                $this->warn("Cannot open {$relativePath}, skipping.");

                continue;
            }

            $currentTeam = null;

            while (($row = fgetcsv($handle)) !== false) {
                if ($row === []) {
                    continue;
                }

                while (count($row) < 10) {
                    $row[] = '';
                }

                $first = trim($row[0]);
                $second = trim($row[1]);

                if ($first === 'क्र.सं.' || $first === 'क्र.सं') {
                    continue;
                }

                if ($first === $second && strlen($first) > 10 && str_starts_with($first, 'उ.प्र. पुलिस')) {
                    $currentTeam = $this->resolveTeamHeader($first, $sportMap, $unitMap);

                    continue;
                }

                if ($currentTeam === null) {
                    continue;
                }

                $rawName = trim($row[3]);

                if ($rawName === '' || ! preg_match('/[\x{0900}-\x{097F}]/u', $rawName)) {
                    continue;
                }

                $pno = $this->extractPno(trim($row[2]), $rawName);

                if ($pno === null) {
                    $skippedRows++;

                    continue;
                }

                $member = Member::withoutGlobalScopes()
                    ->where('organization_id', $org->id)
                    ->where('pno', $pno)
                    ->first();

                if ($member === null) {
                    $skippedRows++;

                    continue;
                }

                $sportId = $currentTeam['sport_id'] ?? $member->sport_id;
                $sportEvent = $this->normalizeCell(trim($row[1]));

                if ($sportId === null) {
                    $skippedRows++;

                    continue;
                }

                $matchedMembers[$member->id] = true;
                $sourceRows++;

                if ($dryRun) {
                    $this->line(sprintf(
                        'Would sync member %d (%s) => sport_id=%d, event=%s',
                        $member->id,
                        $member->pno ?? $member->member_code,
                        $sportId,
                        $sportEvent ?? '—',
                    ));

                    continue;
                }

                DB::transaction(function () use ($member, $sportId, $sportEvent, $currentTeam): void {
                    $existingPivot = DB::table('member_sport')
                        ->where('member_id', $member->id)
                        ->where('sport_id', $sportId)
                        ->first();

                    $pivot = [
                        'role' => filled($existingPivot?->role) ? $existingPivot?->role : null,
                        'position' => filled($existingPivot?->position) ? $existingPivot?->position : null,
                        'sport_event' => filled($existingPivot?->sport_event) ? $existingPivot?->sport_event : $sportEvent,
                        'notes' => filled($existingPivot?->notes) ? $existingPivot?->notes : $currentTeam['unit_name'],
                        'updated_at' => now(),
                    ];

                    if ($existingPivot !== null) {
                        DB::table('member_sport')
                            ->where('id', $existingPivot->id)
                            ->update($pivot);
                    } else {
                        DB::table('member_sport')->insert([
                            'member_id' => $member->id,
                            'sport_id' => $sportId,
                            'created_at' => now(),
                            ...$pivot,
                        ]);
                    }
                });

                $updatedMembers++;
            }

            fclose($handle);
        }

        $matchedCount = count($matchedMembers);
        $summary = $dryRun ? 'Previewed' : 'Synced';

        $this->info(sprintf(
            '%s %d member(s) from %d CSV row(s); skipped %d unmatched row(s).',
            $summary,
            $matchedCount,
            $sourceRows,
            $skippedRows,
        ));

        return self::SUCCESS;
    }

    /**
     * @param  array<string, int>  $sportMap
     * @param  array<string, int>  $unitMap
     * @return array{sport_id: int|null, unit_id: int|null, sport_name: string|null, unit_name: string|null}
     */
    private function resolveTeamHeader(string $header, array $sportMap, array $unitMap): array
    {
        if (! preg_match('/^उ\.प्र\. पुलिस (.+?) टीम (.+)$/u', $header, $matches)) {
            return ['sport_id' => null, 'unit_id' => null, 'sport_name' => null, 'unit_name' => null];
        }

        $sportRaw = trim($matches[1]);
        $unitRaw = trim($matches[2]);

        return [
            'sport_id' => $this->resolveSport($sportRaw, $sportMap),
            'unit_id' => $this->resolveUnit($unitRaw, $unitMap),
            'sport_name' => $sportRaw,
            'unit_name' => $unitRaw,
        ];
    }

    /**
     * @param  array<string, int>  $sportMap
     */
    private function resolveSport(string $raw, array $sportMap): ?int
    {
        $bare = trim((string) preg_replace('/\s*\([^)]*\)\s*/u', '', $raw));

        $candidates = array_unique([$raw, $bare]);

        foreach ($candidates as $candidate) {
            if (isset($sportMap[$candidate])) {
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

        return null;
    }

    private function extractPno(string $rawPno, string $rawName): ?string
    {
        if (preg_match('/^\d{8,12}$/', $rawPno)) {
            return $rawPno;
        }

        if (preg_match('/\b(\d{8,12})\b/', $rawPno, $matches)) {
            return $matches[1];
        }

        if (preg_match('/\b(\d{8,12})\b/', $rawName, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function normalizeCell(string $value): ?string
    {
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);

        return $value === '' ? null : $value;
    }

    /**
     * @return list<string>
     */
    private function sourcePaths(): array
    {
        $override = trim((string) $this->option('source'));

        if ($override !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $override))));
        }

        return [
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/GD_KHILADI.csv'),
            base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/KUSHAL_KHILADI.csv'),
        ];
    }
}
