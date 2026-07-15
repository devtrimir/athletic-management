<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\CloseTeamSessionRequest;
use App\Models\CoachAssignment;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Teams\TeamRosterService;
use App\Services\Teams\TeamSessionClosureService;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TeamSessionStatusController extends Controller
{
    public function activate(
        Team $team,
        TeamSessionStatusManager $teamSessionStatusManager,
        Request $request,
        TeamRosterService $roster,
    ): RedirectResponse {
        Gate::authorize('update', $team);

        $requestedSessionId = $request->input('session_id') ?: $request->input('filter.session_id');
        $sessionId = is_numeric($requestedSessionId) ? (int) $requestedSessionId : null;
        $sessionId ??= (int) $team->session_id;

        $data = $request->validate([
            'restore_member_ids' => ['sometimes', 'array'],
            'restore_member_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', $team->organization_id)],
            'restore_coach_ids' => ['sometimes', 'array'],
            'restore_coach_ids.*' => ['integer', Rule::exists('coaches', 'id')->where('organization_id', $team->organization_id)],
        ]);

        $userId = (int) $request->user()->id;

        if (! empty($data['restore_member_ids'])) {
            $entries = $team->teamMembers()
                ->where('session_id', $sessionId)
                ->whereNotNull('left_on')
                ->whereIn('member_id', $data['restore_member_ids'])
                ->get()
                ->map(fn (TeamMember $row): array => [
                    'member_id' => $row->member_id,
                    'role' => $row->role ?? 'PLAYER',
                    'joined_on' => $row->joined_on?->toDateString(),
                ])
                ->all();

            if ($entries !== []) {
                $roster->restoreMembers($team, $sessionId, $entries, $userId);
            }
        }

        if (! empty($data['restore_coach_ids'])) {
            $removedAssignments = $team->coachAssignments()
                ->where('session_id', $sessionId)
                ->historical()
                ->whereIn('coach_id', $data['restore_coach_ids'])
                ->get();

            foreach ($removedAssignments as $assignment) {
                CoachAssignment::endActiveForTeamCoachSession($team->id, $assignment->coach_id, $sessionId);

                CoachAssignment::create([
                    'team_id' => $team->id,
                    'coach_id' => $assignment->coach_id,
                    'session_id' => $sessionId,
                    'role' => CoachAssignment::normalizeRole($assignment->role),
                    'assigned_at' => now()->startOfDay(),
                    'is_current' => true,
                ]);
            }
        }

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
