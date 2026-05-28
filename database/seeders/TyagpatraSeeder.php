<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Member;
use App\Models\Organization;
use App\Services\MemberCodeGenerator;
use Illuminate\Database\Seeder;

/**
 * Marks departed players from the TYAGPATRA (resignation) sheet.
 *
 * For each row with a resolvable PNO:
 *   - If the member already exists, update current_status.
 *   - If not, create a minimal Member record with the resigned/dismissed/
 *     deceased status directly (these players never appear in the active
 *     GD_KHILADI / KUSHAL_KHILADI CSV exports).
 *
 * Source: analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/TYAGPATRA.csv
 *
 * Column layout (0-indexed):
 *   [0] serial  [1] sport  [2] event_or_pno  [3] name  [4] father_or_pno
 *   [5] joining_date  [6] posting  [7] home_district  [8] status_text
 */
class TyagpatraSeeder extends Seeder
{
    /**
     * Status text keywords → current_status enum value (checked in order).
     *
     * @var list<array{0: string, 1: string}>
     */
    private const STATUS_MAP = [
        ['मृत्यु', 'DECEASED'],
        ['डिसमिस', 'DISMISSED'],
        ['अनुशाशनहीनता', 'DISMISSED'],
        ['त्यागपत्र', 'RESIGNED'],
        ['वापस', 'RESIGNED'],
    ];

    public function run(): void
    {
        $org = Organization::firstOrFail();

        $csvPath = base_path('analysis/raw_csv/UP_POLICE_TEAM_PLAYERS_DETAILS_UPDATED/TYAGPATRA.csv');

        if (! file_exists($csvPath)) {
            $this->command->warn('TyagpatraSeeder: TYAGPATRA.csv not found, skipping.');

            return;
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            $this->command->warn('TyagpatraSeeder: cannot open TYAGPATRA.csv, skipping.');

            return;
        }

        // Skip header row.
        fgetcsv($handle, 0, ',', '"', '');

        $updated = 0;
        $created = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            while (count($row) < 9) {
                $row[] = '';
            }

            $col2 = trim($row[2]);
            $col3 = trim($row[3]);
            $col4 = trim($row[4]);
            $col8 = trim($row[8]);

            $pno = $this->extractPno($col2, $col4);

            if ($pno === null) {
                $skipped++;

                continue;
            }

            $status = $this->resolveStatus($col8);

            if ($status === null) {
                $skipped++;

                continue;
            }

            // Try to update an existing member.
            $affected = Member::withoutGlobalScopes()
                ->where('organization_id', $org->id)
                ->where('pno', $pno)
                ->update(['current_status' => $status]);

            if ($affected > 0) {
                $updated++;

                continue;
            }

            // Member not in active roster — create a minimal record.
            $name = $this->cleanName($col3);

            if (empty($name)) {
                $skipped++;

                continue;
            }

            $code = app(MemberCodeGenerator::class)->nextBatch($org->id, 1, 2026)[0];

            Member::withoutGlobalScopes()->create([
                'organization_id' => $org->id,
                'member_code' => $code,
                'full_name_hi' => $name,
                'pno' => $pno,
                'current_status' => $status,
                'gender' => 'M',
            ]);

            $created++;
        }

        fclose($handle);

        $this->command->info("TyagpatraSeeder: updated {$updated}, created {$created} departed members, skipped {$skipped}.");
    }

    /**
     * Extract a 9-digit PNO from the event cell (col[2]) or the father cell
     * (col[4]).  Returns null when no PNO is found.
     */
    private function extractPno(string $eventCell, string $fatherCell): ?string
    {
        // col[2]: numeric 9-digit value entered directly as integer.
        if (preg_match('/^\\d{9,10}$/', $eventCell)) {
            return $eventCell;
        }

        // col[4]: "PNO-XXXXXXXXX" text format.
        if (preg_match('/PNO-(\\d{9,10})/i', $fatherCell, $m)) {
            return $m[1];
        }

        // col[4]: numeric 9-digit value entered directly.
        if (preg_match('/^\\d{9,10}$/', $fatherCell)) {
            return $fatherCell;
        }

        return null;
    }

    /**
     * Map the raw status text from col[8] to a current_status enum value.
     */
    private function resolveStatus(string $raw): ?string
    {
        foreach (self::STATUS_MAP as [$keyword, $value]) {
            if (str_contains($raw, $keyword)) {
                return $value;
            }
        }

        return null;
    }

    /**
     * Strip honorifics from a name field.
     */
    private function cleanName(string $raw): string
    {
        $name = preg_replace('/^(श्री|श्रीमती|कु\.)\\ */u', '', $raw) ?? $raw;

        return trim($name);
    }
}
