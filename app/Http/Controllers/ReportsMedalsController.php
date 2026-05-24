<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TournamentTier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsMedalsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        $sessions = SportSession::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        $sports = Sport::select(['id', 'name_hi'])
            ->orderBy('name_hi')
            ->get();

        $tiers = TournamentTier::select(['id', 'code', 'label_hi'])
            ->orderByDesc('weight')
            ->get();

        return Inertia::render('reports/medals', [
            'defaultSessionId' => $defaultSessionId,
            'sessions' => $sessions,
            'sports' => $sports,
            'tiers' => $tiers,
        ]);
    }
}
