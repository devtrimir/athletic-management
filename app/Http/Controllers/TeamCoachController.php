<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamCoachRequest;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TeamCoachController extends Controller
{
    public function store(StoreTeamCoachRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $team->session_id;
        $coachId = (int) $data['coach_id'];
        $normalizedRole = CoachAssignment::normalizeRole((string) $data['role']);

        DB::transaction(function () use ($team, $sessionId, $coachId, $normalizedRole): void {
            $currentForCoach = CoachAssignment::where('coach_id', $coachId)
                ->where('session_id', $sessionId)
                ->where('is_current', true)
                ->first();

            if ($currentForCoach !== null) {
                if ($currentForCoach->team_id === $team->id && $currentForCoach->role === $normalizedRole) {
                    throw ValidationException::withMessages([
                        'coach_id' => [__('This coach is already assigned as this role for this session.')],
                    ]);
                }
            }

            // Keep assignment history for the same coach/session before creating a new row.
            CoachAssignment::endActiveForCoachSession((int) $coachId, $sessionId);

            CoachAssignment::create([
                'team_id' => $team->id,
                'coach_id' => $coachId,
                'role' => $normalizedRole,
                'session_id' => $sessionId,
                'assigned_at' => now(),
                'is_current' => true,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach assigned to team.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(Team $team, Coach $coach): RedirectResponse
    {
        Gate::authorize('update', $team);

        CoachAssignment::where('team_id', $team->id)
            ->where('coach_id', $coach->id)
            ->where('is_current', true)
            ->get()
            ->each(fn (CoachAssignment $row) => $row->update([
                'is_current' => false,
                'removed_at' => now(),
                'notes' => __('Removed from team.'),
            ]));

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
            ->where('is_current', true)
            ->get();

        foreach ($rows as $row) {
            $row->update([
                'is_current' => false,
                'removed_at' => now(),
                'notes' => __('Removed from team.'),
            ]);
        }

        $deleted = $rows->count();

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count coaches removed from team.', ['count' => $deleted])]);

        return to_route('teams.show', $team);
    }
}
