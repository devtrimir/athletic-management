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
        $team->load([
            'teamMembers.member',
            'teamMembers.session',
            'coachAssignments.coach',
            'coachAssignments.session',
        ]);

        return response()->json([
            'id' => $team->id,
            'name_hi' => $team->name_hi,
            'in_charge_hi' => $team->in_charge_hi,
            'sport' => $team->sport ? ['id' => $team->sport->id, 'name_hi' => $team->sport->name_hi] : null,
            'session' => $team->session ? ['id' => $team->session->id, 'name' => $team->session->name] : null,
            'unit' => $team->unit ? ['id' => $team->unit->id, 'name_hi' => $team->unit->name_hi] : null,
            'players_count' => $team->teamMembers->count(),
            'coaches_count' => $team->coachAssignments->count(),
            'members' => $team->teamMembers->map(fn ($tm) => [
                'pno' => $tm->member?->pno,
                'full_name_hi' => $tm->member?->full_name_hi,
                'rank' => $tm->member?->rank,
                'role' => $tm->role,
                'session_name' => $tm->session?->name,
            ]),
            'coaches' => $team->coachAssignments->map(fn ($ca) => [
                'full_name_hi' => $ca->coach?->full_name_hi,
                'pno' => $ca->coach?->pno,
                'nis_certified' => $ca->coach?->nis_certified,
                'role' => $ca->role,
                'session_name' => $ca->session?->name,
            ]),
        ]);
    }
}
