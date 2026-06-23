<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\CloseTeamSessionRequest;
use App\Models\Team;
use App\Services\Teams\TeamSessionClosureService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamSessionStatusController extends Controller
{
    public function close(CloseTeamSessionRequest $request, Team $team, TeamSessionClosureService $closure): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $data['session_id'];

        $closure->closeSession(
            team: $team,
            sessionId: $sessionId,
            closedOn: (string) $data['closed_on'],
            reason: (string) $data['reason'],
            userId: (int) $request->user()->id,
            removeCoaches: (bool) $data['remove_coaches'],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team session marked inactive.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }
}
