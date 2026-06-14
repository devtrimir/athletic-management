<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamCoachRequest;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamCoachController extends Controller
{
    public function store(StoreTeamCoachRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();

        // Check: already on this team for this session.
        $onThisTeam = CoachAssignment::where('team_id', $team->id)
            ->where('coach_id', $data['coach_id'])
            ->where('session_id', $data['session_id'])
            ->exists();

        if ($onThisTeam) {
            return back()
                ->withErrors(['coach_id' => __('This coach is already assigned to this team for this session.')])
                ->withInput();
        }

        // Check: already on ANY other team for this session (cross-team uniqueness).
        $crossConflict = CoachAssignment::with(['team:id,name', 'coach:id,full_name'])
            ->where('session_id', $data['session_id'])
            ->where('coach_id', $data['coach_id'])
            ->first();

        if ($crossConflict) {
            $teamName = (string) $crossConflict->team->name;
            $coachName = (string) $crossConflict->coach->full_name;

            return back()
                ->withErrors(['coach_id' => __(':name is already assigned to team :team for this session.', [
                    'name' => $coachName,
                    'team' => $teamName,
                ])])
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

        $ca = CoachAssignment::where('team_id', $team->id)
            ->where('coach_id', $coach->id)
            ->first();

        $ca?->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach removed from team.')]);

        return to_route('teams.show', $team);
    }

    public function bulkDestroy(Request $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $coachIds = $request->validate([
            'coach_ids' => ['required', 'array', 'min:1'],
            'coach_ids.*' => ['integer'],
        ])['coach_ids'];

        $rows = CoachAssignment::where('team_id', $team->id)
            ->whereIn('coach_id', $coachIds)
            ->get();

        foreach ($rows as $row) {
            $row->delete();
        }

        $deleted = $rows->count();

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count coaches removed from team.', ['count' => $deleted])]);

        return to_route('teams.show', $team);
    }
}
