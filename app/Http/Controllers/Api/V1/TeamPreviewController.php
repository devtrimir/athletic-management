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

        $team->loadMissing(['sport', 'session', 'district', 'unit']);
        $team->load([
            'teamMembers.member',
            'teamMembers.session',
            'coachAssignments.coach',
            'coachAssignments.session',
        ]);

        return response()->json([
            'id' => $team->id,
            'name' => $team->name,
            'in_charge' => $team->in_charge,
            'location_type' => $team->location_type,
            'location_label' => $team->location_label,
            'is_active' => $team->is_active,
            'sport' => $team->sport ? ['id' => $team->sport->id, 'name' => $team->sport->name] : null,
            'session' => $team->session ? ['id' => $team->session->id, 'name' => $team->session->name] : null,
            'district' => $team->district ? ['id' => $team->district->id, 'name' => $team->district->name] : null,
            'unit' => $team->unit ? ['id' => $team->unit->id, 'name' => $team->unit->name] : null,
            'players_count' => $team->teamMembers->count(),
            'coaches_count' => $team->coachAssignments->count(),
            'members' => $team->teamMembers->map(fn ($tm) => [
                'pno' => $tm->member?->pno,
                'full_name' => $tm->member?->full_name,
                'rank' => $tm->member?->rank,
                'role' => $tm->role,
                'session_name' => $tm->session?->name,
            ]),
            'coaches' => $team->coachAssignments->map(fn ($ca) => [
                'full_name' => $ca->coach?->full_name,
                'pno' => $ca->coach?->pno,
                'nis_certified' => $ca->coach?->nis_certified,
                'role' => $ca->role,
                'session_name' => $ca->session?->name,
            ]),
        ]);
    }
}
