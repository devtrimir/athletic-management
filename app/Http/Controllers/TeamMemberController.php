<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\BackfillTeamMembersRequest;
use App\Http\Requests\Teams\PreviewTeamMemberBackfillRequest;
use App\Http\Requests\Teams\RemoveTeamMembersRequest;
use App\Http\Requests\Teams\StoreTeamMemberRequest;
use App\Http\Requests\Teams\UpdateTeamMemberRequest;
use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Teams\TeamRosterService;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamMemberController extends Controller
{
    public function __construct(
        private readonly TeamSessionStatusManager $teamSessionStatusManager,
    ) {}

    public function store(StoreTeamMemberRequest $request, Team $team, TeamRosterService $roster): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $data['session_id'];

        $role = $data['role'] ?? 'PLAYER';
        $joinedOn = $data['joined_on'] ?? null;

        $roster->addMembers(
            team: $team,
            memberIds: $data['member_ids'],
            sessionId: $sessionId,
            role: $role,
            joinedOn: $joinedOn,
            userId: (int) $request->user()->id,
        );
        $this->teamSessionStatusManager->ensureActive($team, $sessionId);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Members added to team.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }

    public function update(UpdateTeamMemberRequest $request, Team $team, TeamMember $teamMember): RedirectResponse
    {
        Gate::authorize('update', $team);

        abort_unless($teamMember->team_id === $team->id, 404);

        $teamMember->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team member updated.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $teamMember->session_id]]);
    }

    public function previewBackfill(PreviewTeamMemberBackfillRequest $request, Team $team, TeamRosterService $roster): JsonResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();

        return response()->json($roster->previewBackfill($team, (int) $data['session_id'], $data));
    }

    public function backfill(BackfillTeamMembersRequest $request, Team $team, TeamRosterService $roster): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $data['session_id'];
        $result = $roster->applyBackfill($team, $sessionId, $data, (int) $request->user()->id);
        $this->teamSessionStatusManager->ensureActive($team, $sessionId);

        $message = __(':count roster rows backfilled.', ['count' => $result['applied']]);

        if ($result['skipped'] > 0) {
            $message .= ' '.__(':count blocked rows were skipped.', ['count' => $result['skipped']]);
        }

        Inertia::flash('toast', [
            'type' => $result['skipped'] > 0 ? 'warning' : 'success',
            'message' => $message,
        ]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }

    public function destroy(RemoveTeamMembersRequest $request, Team $team, Member $member, TeamRosterService $roster): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) ($data['session_id'] ?? $this->defaultSessionId($request, $team));

        $roster->removeMembers(
            team: $team,
            memberIds: [$member->id],
            sessionId: $sessionId,
            leftOn: (string) $data['left_on'],
            reason: (string) $data['reason'],
            userId: (int) $request->user()->id,
        );
        $this->teamSessionStatusManager->markInactiveIfSessionEmpty($team, $sessionId);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed from team.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }

    public function bulkDestroy(RemoveTeamMembersRequest $request, Team $team, TeamRosterService $roster): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $memberIds = $data['member_ids'];
        $sessionId = (int) ($data['session_id'] ?? $this->defaultSessionId($request, $team));

        $deleted = $roster->removeMembers(
            team: $team,
            memberIds: $memberIds,
            sessionId: $sessionId,
            leftOn: (string) $data['left_on'],
            reason: (string) $data['reason'],
            userId: (int) $request->user()->id,
        );
        $this->teamSessionStatusManager->markInactiveIfSessionEmpty($team, $sessionId);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count members removed from team.', ['count' => $deleted])]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $sessionId]]);
    }

    private function defaultSessionId(Request $request, Team $team): int
    {
        return (int) (data_get($request->query('filter', []), 'session_id') ?: $team->session_id);
    }
}
