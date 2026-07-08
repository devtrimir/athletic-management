<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Concerns\HasReportFilters;
use App\Services\Reports\MedalsDetailReport;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedalsExportController extends Controller
{
    use HasReportFilters;

    public function __construct(
        private readonly MedalsDetailReport $report,
        private readonly MedalTallyReport $tallyReport,
    ) {}

    public function __invoke(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $request->validate($this->reportFilterRules());

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->resolvedFilters($request);
        $groupBy = $request->string('group_by')->toString();

        if ($groupBy === 'team') {
            return $this->teamTallyExport($orgId, $filters);
        }

        $rows = collect($this->report->run($orgId, $filters, 5000)->items());

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="medals_export_'.now()->format('Ymd_His').'.csv"',
        ];

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');

            // BOM for Excel UTF-8 compatibility
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Medal', 'Position', 'Member Code', 'PNO', 'Name',
                'Rank', 'Gender', 'Unit', 'Session', 'Tournament',
                'Tier', 'Sport', 'Event', 'Discipline', 'Weight Category',
                'Gender Class', 'Venue', 'Date From', 'Date To', 'Remarks',
            ]);

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row['medal_type'],
                    $row['position'],
                    $row['member']['member_code'],
                    $row['member']['pno'],
                    $row['member']['full_name'],
                    $row['member']['rank'],
                    $row['member']['gender'],
                    $row['member']['unit_name'],
                    $row['session_name'],
                    $row['tournament']['name'],
                    $row['tournament']['tier_label'],
                    $row['sport']['name'],
                    $row['event']['name'],
                    $row['event']['discipline'],
                    $row['event']['weight_category'],
                    $row['event']['gender_class'],
                    $row['tournament']['venue'],
                    $row['tournament']['date_from'],
                    $row['tournament']['date_to'],
                    $row['remarks'],
                ]);
            }

            fclose($out);
        }, 'medals_export.csv', $headers);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function teamTallyExport(int $orgId, array $filters): StreamedResponse
    {
        $rows = $this->tallyReport->runTeams($orgId, $filters);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="team_medal_tally_'.now()->format('Ymd_His').'.csv"',
        ];

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');

            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Rank', 'Tier', 'Gold', 'Silver', 'Bronze', 'Merit',
                'Calculated Total', 'Display Only',
            ]);

            foreach ($rows as $index => $row) {
                fputcsv($out, [
                    $index + 1,
                    $row['tier']['label'],
                    $row['GOLD'],
                    $row['SILVER'],
                    $row['BRONZE'],
                    $row['MERIT'],
                    $row['GOLD'] + $row['SILVER'] + $row['BRONZE'] + $row['MERIT'],
                    $row['display_only'],
                ]);
            }

            fclose($out);
        }, 'team_medal_tally.csv', $headers);
    }
}
