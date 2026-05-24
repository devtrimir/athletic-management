<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamCoachRequest;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamCoachController extends Controller
{
    public function store(StoreTeamCoachRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();

        $alreadyAssigned = CoachAssignment::where('team_id', $team->id)
            ->where('coach_id', $data['coach_id'])
            ->where('role', $data['role'])
            ->exists();

        if ($alreadyAssigned) {
            return back()
                ->withErrors(['coach_id' => __('This coach is already assigned to the team with that role.')])
                ->withInput();
        }

        CoachAssignment::create([
            'team_id' => $team->id,
            'coach_id' => $data['coach_id'],
            'role' => $data['role'],
            'session_id' => $data['session_id'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach assigned to team.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(Team $team, Coach $coach): RedirectResponse
    {
        Gate::authorize('update', $team);

        CoachAssignment::where('team_id', $team->id)
            ->where('coach_id', $coach->id)
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach removed from team.')]);

        return to_route('teams.show', $team);
    }
}
