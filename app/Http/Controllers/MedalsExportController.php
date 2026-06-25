<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Concerns\HasReportFilters;
use App\Services\Reports\MedalsDetailReport;
use App\Services\Reports\MedalTallyReport;
use App\Support\Reports\MedalsFilters;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $benefitSub = DB::table('achievement_benefits')
            ->where('benefitable_type', 'App\\Models\\Achievement')
            ->select([
                'benefitable_id',
                'benefit_type',
                'benefit_date',
                'order_reference',
            ]);

        // Fetch all (no pagination) for export — cap at 5000 rows for safety
        $query = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->leftJoin('sports as s', 's.id', '=', 'e.sport_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 't.session_id')
            ->leftJoinSub($benefitSub, 'ab', 'ab.benefitable_id', '=', 'a.id')
            ->select([
                'a.medal_type',
                'a.position',
                'a.remarks',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.gender',
                'u.name as unit_name',
                't.name as tournament_name',
                't.venue',
                't.date_from',
                't.date_to',
                'tt.label_hi as tier_label',
                'ss.name as session_name',
                's.name as sport_name',
                'e.name as event_name',
                'e.discipline',
                'e.weight_category',
                'e.gender_class',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at');

        $rows = MedalsFilters::apply($query, $filters)
            ->orderByRaw("FIELD(a.medal_type, 'GOLD', 'SILVER', 'BRONZE', 'MERIT')")
            ->orderByDesc('t.date_from')
            ->orderBy('m.full_name')
            ->limit(5000)
            ->get();

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
                    $row->medal_type,
                    $row->position,
                    $row->member_code,
                    $row->pno,
                    $row->full_name,
                    $row->rank,
                    $row->gender,
                    $row->unit_name,
                    $row->session_name,
                    $row->tournament_name,
                    $row->tier_label,
                    $row->sport_name,
                    $row->event_name,
                    $row->discipline,
                    $row->weight_category,
                    $row->gender_class,
                    $row->venue,
                    $row->date_from,
                    $row->date_to,
                    $row->remarks,
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
                'S No', 'Team', 'Sport', 'Session', 'Unit', 'District',
                'Gold', 'Silver', 'Bronze', 'Merit', 'Calculated Total',
                'Display Only', 'Events', 'Players',
            ]);

            foreach ($rows as $index => $row) {
                fputcsv($out, [
                    $index + 1,
                    $row['team']['name'],
                    $row['team']['sport_name'],
                    $row['team']['session_name'],
                    $row['team']['unit_name'],
                    $row['team']['district_name'],
                    $row['GOLD'],
                    $row['SILVER'],
                    $row['BRONZE'],
                    $row['MERIT'],
                    $row['GOLD'] + $row['SILVER'] + $row['BRONZE'] + $row['MERIT'],
                    $row['display_only'],
                    $row['events'],
                    $row['players'],
                ]);
            }

            fclose($out);
        }, 'team_medal_tally.csv', $headers);
    }
}
