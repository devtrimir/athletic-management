<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\CloseTeamSessionRequest;
use App\Models\Team;
use App\Services\Teams\TeamSessionClosureService;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamSessionStatusController extends Controller
{
    public function activate(
        Team $team,
        TeamSessionStatusManager $teamSessionStatusManager,
        Request $request,
    ): RedirectResponse {
        Gate::authorize('update', $team);

        $requestedSessionId = $request->input('session_id') ?: $request->input('filter.session_id');
        $sessionId = is_numeric($requestedSessionId) ? (int) $requestedSessionId : null;
        $sessionId ??= (int) $team->session_id;

        $teamSessionStatusManager->ensureActive($team, $sessionId);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team session marked active.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }

    public function close(CloseTeamSessionRequest $request, Team $team, TeamSessionClosureService $closure): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $data['session_id'];
        $preserveMembers = (bool) $data['preserve_members'];

        $closure->closeSession(
            team: $team,
            sessionId: $sessionId,
            closedOn: (string) $data['closed_on'],
            reason: (string) $data['reason'],
            userId: (int) $request->user()->id,
            removeCoaches: (bool) $data['remove_coaches'],
            removeMembers: ! $preserveMembers,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team session marked inactive.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }
}
