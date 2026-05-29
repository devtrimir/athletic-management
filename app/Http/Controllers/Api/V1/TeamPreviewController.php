<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TeamPreviewController extends Controller
{
    public function __invoke(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('view', $team);

        $team->loadMissing(['sport', 'session', 'unit']);
        $team->loadCount(['teamMembers', 'coachAssignments']);

        return response()->json([
            'id' => $team->id,
            'name_hi' => $team->name_hi,
            'in_charge_hi' => $team->in_charge_hi,
            'sport' => $team->sport ? ['id' => $team->sport->id, 'name_hi' => $team->sport->name_hi] : null,
            'session' => $team->session ? ['id' => $team->session->id, 'name' => $team->session->name] : null,
            'unit' => $team->unit ? ['id' => $team->unit->id, 'name_hi' => $team->unit->name_hi] : null,
            'players_count' => $team->team_members_count ?? 0,
            'coaches_count' => $team->coach_assignments_count ?? 0,
        ]);
    }
}
