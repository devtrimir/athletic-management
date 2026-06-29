<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SportsCalendar;
use App\Models\User;
use Illuminate\Database\Seeder;
use ZipArchive;

class SportsCalendarSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->first();

        if ($organization === null) {
            $this->command?->warn('SportsCalendarSeeder: No organization found. Run OrganizationSeeder first.');

            return;
        }

        $admin = User::query()->withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->first();

        $definitions = $this->loadDefinitions();

        if ($definitions === []) {
            $this->command?->warn('SportsCalendarSeeder: No rows found in cal 26.docx. Nothing to seed.');

            return;
        }

        $created = 0;
        $updated = 0;

        foreach ($definitions as $definition) {
            $calendar = SportsCalendar::withoutGlobalScopes()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'year' => 2026,
                    'competition_name' => $definition['competition_name'],
                ],
                [
                    'proposed_month' => $definition['proposed_month'],
                    'proposed_month_annual' => $definition['proposed_month_annual'],
                    'proposed_venue' => $definition['proposed_venue'],
                    'report_arrived' => false,
                    'created_by' => $admin?->id,
                    'updated_by' => $admin?->id,
                ],
            );

            if ($calendar->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
        }

        $this->command?->info("SportsCalendarSeeder: {$created} created, {$updated} updated.");
    }

    /**
     * @return list<array{
     *   competition_name: string,
     *   proposed_month: string,
     *   proposed_month_annual: string|null,
     *   proposed_venue: string,
     * }>
     */
    private function loadDefinitions(): array
    {
        $docPath = base_path('cal 26.docx');

        if (! file_exists($docPath)) {
            return [];
        }

        return $this->extractRowsFromDocx($docPath);
    }

    /**
     * @return list<array{
     *   competition_name: string,
     *   proposed_month: string,
     *   proposed_month_annual: string|null,
     *   proposed_venue: string,
     * }>
     */
    private function extractRowsFromDocx(string $path): array
    {
        $archive = new ZipArchive();

        if ($archive->open($path) !== true) {
            return [];
        }

        $xml = $archive->getFromName('word/document.xml');
        $archive->close();

        if ($xml === false) {
            return [];
        }

        $document = new \SimpleXMLElement($xml);
        $document->registerXPathNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $tables = $document->xpath('//w:tbl');

        if ($tables === false || $tables === []) {
            return [];
        }

        $rows = $tables[0]->xpath('w:tr');

        if ($rows === false) {
            return [];
        }

        $rowsData = [];

        foreach ($rows as $row) {
            $cells = $row->xpath('w:tc');

            if ($cells === false || count($cells) < 5) {
                continue;
            }

            $serial = $this->normalizeText($this->extractCellText($cells[0]));

            if ($serial === '' || ! ctype_digit($serial)) {
                continue;
            }

            $competitionName = $this->normalizeText($this->extractCellText($cells[1]));

            if ($competitionName === '') {
                continue;
            }

            $proposedMonthCell = $this->extractCellText($cells[2]);
            $proposedMonthAnnualCell = $this->extractCellText($cells[3]);

            $rowsData[] = [
                'competition_name' => $competitionName,
                'proposed_month' => $this->normalizeMonthRequired($proposedMonthCell, $proposedMonthAnnualCell),
                'proposed_month_annual' => $this->normalizeMonth($proposedMonthAnnualCell),
                'proposed_venue' => $this->normalizeText($this->extractCellText($cells[4])),
            ];
        }

        return $rowsData;
    }

    private function extractCellText(\SimpleXMLElement $cell): string
    {
        $texts = $cell->xpath('.//w:t');

        if ($texts === false) {
            return '';
        }

        $parts = [];

        foreach ($texts as $textNode) {
            $parts[] = (string) $textNode;
        }

        return implode(' ', $parts);
    }

    private function normalizeText(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', $value));
    }

    private function normalizeMonthRequired(string $value, string $fallback = ''): string
    {
        $normalized = $this->normalizeMonth($value);

        if ($normalized !== null) {
            return $normalized;
        }

        $fallbackMonth = $this->normalizeMonth($fallback);

        if ($fallbackMonth !== null) {
            return $fallbackMonth;
        }

        return '-';
    }

    private function normalizeMonth(string $value): ?string
    {
        $normalized = $this->normalizeText($value);

        return match ($normalized) {
            '', '-', '–', '—' => null,
            default => $normalized,
        };
    }
}
