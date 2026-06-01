<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Concerns\HasReportFilters;
use App\Services\Reports\MedalsDetailReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedalsExportController extends Controller
{
    use HasReportFilters;

    public function __construct(private readonly MedalsDetailReport $report) {}

    public function __invoke(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $request->validate($this->reportFilterRules());

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->resolvedFilters($request);

        // Fetch all (no pagination) for export — cap at 5000 rows for safety
        $rows = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->leftJoin('sports as s', 's.id', '=', 'e.sport_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 't.session_id')
            ->select([
                'a.medal_type',
                'a.position',
                'a.remarks',
                'm.member_code',
                'm.pno',
                'm.full_name_hi',
                'm.rank',
                'm.gender',
                'u.name_hi as unit_name',
                't.name_hi as tournament_name',
                't.venue',
                't.date_from',
                't.date_to',
                'tt.label_hi as tier_label',
                'ss.name as session_name',
                's.name_hi as sport_name',
                'e.name_hi as event_name',
                'e.discipline',
                'e.weight_category',
                'e.gender_class',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at')
            ->when($filters['year_from'], fn ($q) => $q->whereYear('t.date_from', '>=', $filters['year_from']))
            ->when($filters['year_to'], fn ($q) => $q->whereYear('t.date_from', '<=', $filters['year_to']))
            ->when($filters['sport_id'], fn ($q) => $q->where('e.sport_id', $filters['sport_id']))
            ->when($filters['tier_id'], fn ($q) => $q->where('t.tier_id', $filters['tier_id']))
            ->when($filters['unit_id'], fn ($q) => $q->where('m.current_unit_id', $filters['unit_id']))
            ->when($filters['medal_type'], fn ($q) => $q->where('a.medal_type', $filters['medal_type']))
            ->when($filters['gender'], fn ($q) => $q->where('m.gender', $filters['gender']))
            ->when($filters['member_name'], fn ($q) => $q->where('m.full_name_hi', 'like', "%{$filters['member_name']}%"))
            ->when($filters['pno'], fn ($q) => $q->where('m.pno', 'like', "%{$filters['pno']}%"))
            ->when($filters['tournament_id'], fn ($q) => $q->where('t.id', $filters['tournament_id']))
            ->when($filters['event_name'], fn ($q) => $q->where('e.name_hi', 'like', "%{$filters['event_name']}%"))
            ->orderByRaw("FIELD(a.medal_type, 'GOLD', 'SILVER', 'BRONZE', 'MERIT')")
            ->orderByDesc('t.date_from')
            ->orderBy('m.full_name_hi')
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
                'Medal', 'Position', 'Member Code', 'PNO', 'Name (Hindi)',
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
                    $row->full_name_hi,
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
}
