<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Sport;
use App\Models\TournamentTier;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsMedalsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $orgId = (int) $request->user()->organization_id;

        $sports = Sport::select(['id', 'name_hi', 'name_en'])
            ->orderBy('name_hi')
            ->get();

        $tiers = TournamentTier::select(['id', 'code', 'label_hi', 'label_en'])
            ->orderByDesc('weight')
            ->get();

        $units = Unit::select(['id', 'name_hi', 'name_en'])
            ->where('organization_id', $orgId)
            ->orderBy('name_hi')
            ->get();

        return Inertia::render('reports/medals', [
            'defaultYearFrom' => (int) now()->year,
            'defaultYearTo' => (int) now()->year,
            'sports' => $sports,
            'tiers' => $tiers,
            'units' => $units,
        ]);
    }
}
