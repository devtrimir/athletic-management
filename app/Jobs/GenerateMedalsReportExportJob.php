<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exports\MedalsReportExport;
use App\Exports\MedalsReportWorkbookExport;
use App\Models\ReportExport;
use App\Services\Reports\MedalsDetailReport;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Browsershot\Browsershot;
use Throwable;

class GenerateMedalsReportExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(public readonly int $exportId) {}

    public function handle(MedalTallyReport $tallyReport, MedalsDetailReport $detailReport): void
    {
        $export = ReportExport::query()->findOrFail($this->exportId);
        $export->update([
            'status' => ReportExport::STATUS_PROCESSING,
            'started_at' => now(),
            'error_message' => null,
        ]);

        $filters = $export->filters ?? [];
        $options = $export->options ?? [];
        $orgId = (int) $export->organization_id;
        $sections = $this->sections($options);
        $groupBy = ($options['group_by'] ?? 'tier') === 'team' ? 'team' : 'tier';
        $orientation = ($options['orientation'] ?? 'landscape') === 'portrait' ? 'portrait' : 'landscape';

        $tallyRows = $groupBy === 'team'
            ? $tallyReport->runTeams($orgId, $filters)->values()
            : $tallyReport->run($orgId, $filters)->values();
        $detailRows = collect($detailReport->run($orgId, $filters, 10000)->items())->values();
        $title = in_array('detail', $sections, true) && ! in_array('tally', $sections, true)
            ? 'Medal Details'
            : 'Medal Tally';
        $extension = $export->format === 'xlsx' ? 'xlsx' : 'pdf';
        $path = sprintf('exports/medals/%s.%s', $export->id.'-'.now()->format('YmdHis'), $extension);
        $fileName = sprintf('medal-report-%s.%s', now()->format('Ymd-His'), $extension);

        if ($export->format === 'xlsx') {
            Excel::store($this->excelWorkbook($sections, $tallyRows, $detailRows, $title), $path, 'local');
        } else {
            $payload = [
                'title' => $title,
                'orientation' => $orientation,
                'printedAt' => now()->format('d M Y, h:i A').' IST',
                'sections' => $sections,
                'tallyRows' => $tallyRows->all(),
                'detailRows' => $this->pdfDetailRows($detailRows),
                'fontDataUri' => $this->dataUri(resource_path('fonts/notosansdevanagari-devanagari.woff2'), 'font/woff2'),
                'logoDataUri' => $this->dataUri(public_path('logo.jpg'), 'image/jpeg'),
            ];

            Storage::disk('local')->makeDirectory(dirname($path));

            $browser = Browsershot::html(view('reports.medals.export-pdf', $payload)->render())
                ->format('A4')
                ->margins(8, 8, 8, 8)
                ->showBackground()
                ->waitUntilNetworkIdle()
                ->noSandbox();

            if ($chromePath = $this->chromePath()) {
                $browser->setChromePath($chromePath);
            }

            if ($orientation === 'landscape') {
                $browser->landscape();
            }

            $browser->save(Storage::disk('local')->path($path));
        }

        $export->update([
            'status' => ReportExport::STATUS_COMPLETED,
            'file_path' => $path,
            'file_name' => $fileName,
            'completed_at' => now(),
        ]);
    }

    /** @param Collection<int, mixed> $tallyRows @param Collection<int, mixed> $detailRows */
    private function excelWorkbook(array $sections, Collection $tallyRows, Collection $detailRows, string $title): MedalsReportWorkbookExport|MedalsReportExport
    {
        $sheets = [];

        if (in_array('tally', $sections, true)) {
            [$rows, $mergeRanges] = $this->excelRows(['tally'], $tallyRows, $detailRows);
            $sheets[] = new MedalsReportExport($rows, $this->excelHeadings(['tally']), 'Medal Tally', $mergeRanges);
        }

        if (in_array('detail', $sections, true)) {
            [$rows, $mergeRanges] = $this->excelRows(['detail'], $tallyRows, $detailRows);
            $sheets[] = new MedalsReportExport($rows, $this->excelHeadings(['detail']), 'Medal Details', $mergeRanges);
        }

        if (count($sheets) === 1) {
            return $sheets[0];
        }

        return new MedalsReportWorkbookExport($sheets);
    }

    public function failed(Throwable $exception): void
    {
        ReportExport::query()
            ->whereKey($this->exportId)
            ->update([
                'status' => ReportExport::STATUS_FAILED,
                'error_message' => mb_substr($exception->getMessage(), 0, 2000),
                'completed_at' => now(),
            ]);
    }

    /** @param array<string, mixed> $options @return array<int, string> */
    private function sections(array $options): array
    {
        $sections = collect($options['sections'] ?? ['detail'])
            ->filter(fn (mixed $section): bool => in_array($section, ['tally', 'detail'], true))
            ->values()
            ->all();

        return $sections === [] ? ['detail'] : $sections;
    }

    /** @param Collection<int, mixed> $tallyRows @param Collection<int, mixed> $detailRows @return array{0: array<int, array<int, mixed>>, 1: array<int, string>} */
    private function excelRows(array $sections, Collection $tallyRows, Collection $detailRows): array
    {
        if (in_array('tally', $sections, true) && ! in_array('detail', $sections, true)) {
            return [$tallyRows->map(fn (mixed $row, int $index): array => [
                $index + 1,
                data_get($row, 'tier.label'),
                data_get($row, 'GOLD'),
                data_get($row, 'SILVER'),
                data_get($row, 'BRONZE'),
                data_get($row, 'MERIT'),
                (int) data_get($row, 'GOLD') + (int) data_get($row, 'SILVER') + (int) data_get($row, 'BRONZE') + (int) data_get($row, 'MERIT'),
                data_get($row, 'display_only'),
            ])->all(), []];
        }

        $rows = [];
        $mergeRanges = [];
        $previous = ['tier' => null, 'session' => null, 'medal' => null, 'tournament' => null, 'sport' => null];
        $mergeTrackers = [
            'medal' => ['column' => 'B', 'key' => null, 'start' => null, 'count' => 0],
            'sport' => ['column' => 'G', 'key' => null, 'start' => null, 'count' => 0],
            'tournament' => ['column' => 'I', 'key' => null, 'start' => null, 'count' => 0],
            'session' => ['column' => 'J', 'key' => null, 'start' => null, 'count' => 0],
        ];
        $serial = 0;
        $sheetRow = 2;

        foreach ($detailRows as $index => $row) {
            $tier = data_get($row, 'tournament.tier_label') ?: 'Other';
            $session = data_get($row, 'session_name') ?: '';
            $isTeam = data_get($row, 'event.event_type') === 'team';
            $medal = (string) data_get($row, 'medal_type');
            $tournament = trim((string) data_get($row, 'tournament.name')."\n".implode(' - ', array_filter([
                data_get($row, 'tournament.date_from'),
                data_get($row, 'tournament.date_to'),
            ])));
            $sport = data_get($row, 'sport.name') ?: '';
            $event = data_get($row, 'event.weight_category') ?: data_get($row, 'event.name');
            $teamKey = $isTeam ? $this->teamKey($row) : null;
            $startsMedal = ! $isTeam || $index === 0 || $teamKey !== $this->teamKey($detailRows[$index - 1] ?? []);

            if ($tier !== $previous['tier']) {
                $this->flushExcelMergeTrackers($mergeTrackers, $mergeRanges);
                $rows[] = [$tier, '', '', '', '', '', '', '', '', ''];
                $mergeRanges[] = "A{$sheetRow}:J{$sheetRow}";
                $sheetRow++;
                $previous = ['tier' => $tier, 'session' => null, 'medal' => null, 'tournament' => null, 'sport' => null];
                $mergeTrackers = [
                    'medal' => ['column' => 'B', 'key' => null, 'start' => null, 'count' => 0],
                    'sport' => ['column' => 'G', 'key' => null, 'start' => null, 'count' => 0],
                    'tournament' => ['column' => 'I', 'key' => null, 'start' => null, 'count' => 0],
                    'session' => ['column' => 'J', 'key' => null, 'start' => null, 'count' => 0],
                ];
            }

            if ($startsMedal) {
                $serial++;
            }

            $rows[] = [
                $startsMedal ? $serial : '',
                $isTeam || $medal !== $previous['medal'] ? $medal : '',
                data_get($row, 'member.full_name'),
                data_get($row, 'member.pno'),
                data_get($row, 'member.rank'),
                data_get($row, 'member.unit_name'),
                $sport !== $previous['sport'] ? $sport : '',
                $startsMedal ? trim((string) $event.($isTeam ? "\nTeam" : '')) : '',
                $tournament !== $previous['tournament'] ? $tournament : '',
                $session !== $previous['session'] ? $session : '',
            ];

            $this->advanceExcelMergeTracker($mergeTrackers['medal'], $mergeRanges, $isTeam ? 'team:'.$teamKey : 'medal:'.$medal, $sheetRow);
            $this->advanceExcelMergeTracker($mergeTrackers['sport'], $mergeRanges, 'sport:'.(data_get($row, 'sport.id') ?: $sport), $sheetRow);
            $this->advanceExcelMergeTracker($mergeTrackers['tournament'], $mergeRanges, 'tournament:'.(data_get($row, 'tournament.id') ?: $tournament), $sheetRow);
            $this->advanceExcelMergeTracker($mergeTrackers['session'], $mergeRanges, 'session:'.$session, $sheetRow);

            $previous['session'] = $session;
            $previous['medal'] = $isTeam ? null : $medal;
            $previous['tournament'] = $tournament;
            $previous['sport'] = $sport;
            $sheetRow++;
        }

        $this->flushExcelMergeTrackers($mergeTrackers, $mergeRanges);

        return [$rows, $mergeRanges];
    }

    /** @param array{column: string, key: mixed, start: int|null, count: int} $tracker */
    private function advanceExcelMergeTracker(array &$tracker, array &$mergeRanges, string $key, int $sheetRow): void
    {
        if ($tracker['key'] !== $key) {
            $this->applyExcelMergeTracker($tracker, $mergeRanges);
            $tracker['key'] = $key;
            $tracker['start'] = $sheetRow;
            $tracker['count'] = 1;

            return;
        }

        $tracker['count']++;
    }

    /** @param array<string, array{column: string, key: mixed, start: int|null, count: int}> $trackers */
    private function flushExcelMergeTrackers(array &$trackers, array &$mergeRanges): void
    {
        foreach ($trackers as &$tracker) {
            $this->applyExcelMergeTracker($tracker, $mergeRanges);
            $tracker['key'] = null;
            $tracker['start'] = null;
            $tracker['count'] = 0;
        }
    }

    /** @param array{column: string, key: mixed, start: int|null, count: int} $tracker */
    private function applyExcelMergeTracker(array $tracker, array &$mergeRanges): void
    {
        if ($tracker['start'] === null || $tracker['count'] < 2) {
            return;
        }

        $end = $tracker['start'] + $tracker['count'] - 1;
        $mergeRanges[] = "{$tracker['column']}{$tracker['start']}:{$tracker['column']}{$end}";
    }

    /** @return array<int, string> */
    private function excelHeadings(array $sections): array
    {
        return in_array('tally', $sections, true) && ! in_array('detail', $sections, true)
            ? ['Rank', 'Tier', 'Gold', 'Silver', 'Bronze', 'Merit', 'Calculated', 'Display only']
            : ['S. No.', 'Medal', 'Athlete', 'PNO', 'Rank', 'Posting', 'Sport', 'Event / Weight', 'Tournament', 'Session'];
    }

    /** @param Collection<int, mixed> $detailRows @return array<int, array<string, mixed>> */
    private function pdfDetailRows(Collection $detailRows): array
    {
        $rows = [];
        $previousTier = null;
        $serial = 0;
        $previousTeamKey = null;

        foreach ($detailRows as $row) {
            $tier = data_get($row, 'tournament.tier_label') ?: 'Other';
            $isTeam = data_get($row, 'event.event_type') === 'team';
            $teamKey = $isTeam ? $this->teamKey($row) : null;
            $startsMedal = ! $isTeam || $teamKey !== $previousTeamKey;
            $tournament = trim((string) data_get($row, 'tournament.name')."\n".implode(' - ', array_filter([
                data_get($row, 'tournament.date_from'),
                data_get($row, 'tournament.date_to'),
            ])));

            if ($tier !== $previousTier) {
                $rows[] = ['type' => 'tier', 'label' => $tier];
                $previousTier = $tier;
            }

            if ($startsMedal) {
                $serial++;
            }

            $rows[] = [
                'type' => 'row',
                'serial' => $startsMedal ? $serial : '',
                'medal' => $startsMedal ? data_get($row, 'medal_type') : '',
                'athlete' => data_get($row, 'member.full_name'),
                'pno' => data_get($row, 'member.pno'),
                'rank' => data_get($row, 'member.rank'),
                'posting' => data_get($row, 'member.unit_name'),
                'sport' => data_get($row, 'sport.name'),
                'event' => trim((string) (data_get($row, 'event.weight_category') ?: data_get($row, 'event.name')).($isTeam && $startsMedal ? ' / Team' : '')),
                'tournament' => $tournament,
                'session' => data_get($row, 'session_name'),
                'merge_keys' => [
                    'medal' => $isTeam ? 'team:'.$teamKey : 'medal:'.data_get($row, 'medal_type'),
                    'sport' => 'sport:'.data_get($row, 'sport.id'),
                    'tournament' => 'tournament:'.data_get($row, 'tournament.id').':'.$tournament,
                    'session' => 'session:'.(data_get($row, 'session_name') ?: ''),
                ],
                'rowspans' => [],
                'skip' => [],
            ];

            $previousTeamKey = $teamKey;
        }

        return $this->withPdfRowspans($rows, ['medal', 'sport', 'tournament', 'session']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $columns
     * @return array<int, array<string, mixed>>
     */
    private function withPdfRowspans(array $rows, array $columns): array
    {
        foreach ($columns as $column) {
            $start = null;
            $count = 0;
            $key = null;

            foreach ($rows as $index => $row) {
                if (($row['type'] ?? null) !== 'row') {
                    $this->applyPdfRowspan($rows, $column, $start, $count);
                    $start = null;
                    $count = 0;
                    $key = null;

                    continue;
                }

                $rowKey = data_get($row, "merge_keys.{$column}");

                if ($rowKey !== $key) {
                    $this->applyPdfRowspan($rows, $column, $start, $count);
                    $start = $index;
                    $count = 1;
                    $key = $rowKey;

                    continue;
                }

                $count++;
            }

            $this->applyPdfRowspan($rows, $column, $start, $count);
        }

        return $rows;
    }

    /** @param array<int, array<string, mixed>> $rows */
    private function applyPdfRowspan(array &$rows, string $column, ?int $start, int $count): void
    {
        if ($start === null || $count < 2) {
            return;
        }

        $rows[$start]['rowspans'][$column] = $count;

        for ($index = $start + 1; $index < $start + $count; $index++) {
            $rows[$index]['skip'][$column] = true;
        }
    }

    private function teamKey(mixed $row): string
    {
        return implode(':', [
            data_get($row, 'tournament.id'),
            data_get($row, 'event.id'),
            data_get($row, 'medal_type'),
            data_get($row, 'position'),
        ]);
    }

    private function dataUri(string $path, string $mime): ?string
    {
        if (! is_file($path)) {
            return null;
        }

        return sprintf('data:%s;base64,%s', $mime, base64_encode((string) file_get_contents($path)));
    }

    private function chromePath(): ?string
    {
        $paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        ];

        foreach ($paths as $path) {
            if (is_executable($path)) {
                return $path;
            }
        }

        return null;
    }
}
