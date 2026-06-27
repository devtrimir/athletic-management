<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Designation;
use App\Models\District;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportsMedalsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return $this->render($request, 'tally');
    }

    public function detail(Request $request): Response
    {
        return $this->render($request, 'detail');
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

        $currentSessionId = $sessions->firstWhere('is_current', true)?->id;

        $districts = District::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $ranks = Rank::active()
            ->ordered()
            ->get(['code', 'name', 'short_name']);

        $designations = Designation::active()
            ->ordered()
            ->get(['code', 'name', 'short_name']);

        $tournaments = Tournament::query()
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->orderByDesc('date_from')
            ->limit(500)
            ->get(['id', 'session_id', 'name', 'date_from']);

        $eventOptions = DB::table('events as e')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at');

        return Inertia::render('reports/medals', [
            'initialTab' => $initialTab,
            'defaultYearFrom' => (int) now()->year,
            'defaultYearTo' => (int) now()->year,
            'defaultSessionId' => $currentSessionId,
            'sessions' => $sessions,
            'sports' => $sports,
            'tiers' => $tiers,
            'units' => $units,
            'districts' => $districts,
            'ranks' => $ranks,
            'designations' => $designations,
            'tournaments' => $tournaments,
            'events' => (clone $eventOptions)
                ->orderBy('e.name')
                ->get(['e.id', 'e.tournament_id', 'e.name']),
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
