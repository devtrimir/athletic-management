<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Team;
use App\Support\Teams\TeamProfileData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TeamProfileTabController extends Controller
{
    public function players(Team $team, Request $request, TeamProfileData $profileData): Response
    {
        Gate::authorize('view', $team);

        return Inertia::render('teams/show', $profileData->players(
            $team,
            (int) $request->user()->organization_id,
            $this->requestedSessionId($request),
        ));
    }

    public function coaches(Team $team, Request $request, TeamProfileData $profileData): Response
    {
        Gate::authorize('view', $team);

        return Inertia::render('teams/show', $profileData->coaches(
            $team,
            (int) $request->user()->organization_id,
            $this->requestedSessionId($request),
        ));
    }

    public function incharge(Team $team, Request $request, TeamProfileData $profileData): Response
    {
        Gate::authorize('view', $team);

        return Inertia::render('teams/show', $profileData->incharge(
            $team,
            (int) $request->user()->organization_id,
            $this->requestedSessionId($request),
        ));
    }

    public function changelog(Team $team, Request $request, TeamProfileData $profileData): Response
    {
        Gate::authorize('view', $team);

        return Inertia::render('teams/show', $profileData->changelog(
            $team,
            (int) $request->user()->organization_id,
            $this->requestedSessionId($request),
        ));
    }

    private function requestedSessionId(Request $request): ?int
    {
        $sessionId = $request->input('filter.session_id');

        return is_numeric($sessionId) ? (int) $sessionId : null;
    }
}
