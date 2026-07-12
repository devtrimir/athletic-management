<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Concerns\HasReportFilters;
use App\Models\Designation;
use App\Models\District;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\Reports\MedalsDetailReport;
use App\Services\Reports\MedalTallyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportsMedalsController extends Controller
{
    use HasReportFilters;

    public function __construct(
        private readonly MedalTallyReport $tallyReport,
        private readonly MedalsDetailReport $detailReport,
    ) {}

    public function __invoke(Request $request): Response
    {
        return $this->render($request, 'tally');
    }

    public function detail(Request $request): Response
    {
        return $this->render($request, 'detail');
    }

    public function print(Request $request): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);
        $request->validate($this->reportFilterRules() + [
            'tab' => ['nullable', 'string', 'in:tally,detail'],
            'group_by' => ['nullable', 'string', 'in:tier,team'],
            'page_mode' => ['nullable', 'string', 'in:portrait,landscape'],
        ]);

        $orgId = (int) $request->user()->organization_id;
        $filters = $this->resolvedFilters($request);
        $tab = $request->query('tab', 'tally') === 'detail' ? 'detail' : 'tally';
        $groupBy = $request->query('group_by') === 'team' ? 'team' : 'tier';
        $pageMode = $request->query('page_mode') === 'portrait' ? 'portrait' : 'landscape';
        $printSections = (string) $request->query('print_sections', '');

        $tallyRows = $groupBy === 'team'
            ? $this->tallyReport->runTeams($orgId, $filters)
            : $this->tallyReport->run($orgId, $filters);
        $detailPaginator = $this->detailReport->run($orgId, $filters, 10000);
        $detailRows = $detailPaginator->items();
        $detailCounts = $this->detailReport->countByType($orgId, $filters);

        return Inertia::render('reports/medals/print', [
            'tab' => $tab,
            'groupBy' => $groupBy,
            'pageMode' => $pageMode,
            'printSections' => $printSections,
            'tallyRows' => $tallyRows->values(),
            'detailRows' => array_values($detailRows),
            'detailCounts' => $detailCounts,
            'detailTotal' => array_sum($detailCounts),
            'reportMeta' => [
                'title' => $tab === 'detail' ? 'Medal Details' : 'Medal Tally',
                'printedAt' => now()->timezone('Asia/Kolkata')->format('d M Y, h:i A').' IST',
            ],
        ]);
    }

    private function render(Request $request, string $initialTab): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);
        abort_if(! in_array($initialTab, ['tally', 'detail'], true), 400, 'Invalid medal tab.');

        $orgId = (int) $request->user()->organization_id;

        $sports = Sport::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $tiers = TournamentTier::select(['id', 'code', 'label_hi', 'label_en'])
            ->orderByDesc('weight')
            ->get();

        $units = Unit::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        $sessions = SportSession::query()
            ->where('organization_id', $orgId)
            ->orderByDesc('start_year')
            ->get(['id', 'name', 'is_current']);

        $districts = District::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $ranks = Rank::active()
            ->ordered()
            ->get(['code', 'name', 'short_name']);

        $designations = Designation::active()
            ->ordered()
            ->get(['code', 'name', 'short_name']);

        $eventOptions = DB::table('events as e')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at');

        return Inertia::render('reports/medals', [
            'initialTab' => $initialTab,
            'defaultYearFrom' => null,
            'defaultYearTo' => null,
            'defaultSessionId' => null,
            'sessions' => $sessions,
            'sports' => $sports,
            'tiers' => $tiers,
            'units' => $units,
            'districts' => $districts,
            'ranks' => $ranks,
            'designations' => $designations,
            'venues' => (clone $eventOptions)
                ->distinct()
                ->whereNotNull('t.venue')
                ->where('t.venue', '<>', '')
                ->orderBy('t.venue')
                ->pluck('t.venue')
                ->values(),
            'disciplines' => (clone $eventOptions)
                ->distinct()
                ->whereNotNull('e.discipline')
                ->where('e.discipline', '<>', '')
                ->orderBy('e.discipline')
                ->pluck('e.discipline')
                ->values(),
            'weightCategories' => (clone $eventOptions)
                ->distinct()
                ->whereNotNull('e.weight_category')
                ->where('e.weight_category', '<>', '')
                ->orderBy('e.weight_category')
                ->pluck('e.weight_category')
                ->values(),
        ]);
    }
}
