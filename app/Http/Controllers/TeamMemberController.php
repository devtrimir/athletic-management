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

    public function available(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('view', $team);

        $orgId = (int) $request->user()->organization_id;

        $sportId = null;
        if ($request->has('sport_id')) {
            $val = $request->input('sport_id');
            if ($val !== '' && $val !== null && $val !== '_all') {
                $sportId = (int) $val;
            }
        } else {
            $sportId = $team->sport_id ? (int) $team->sport_id : null;
        }

        $sessionId = (int) ($request->input('session_id') ?: $team->session_id);
        $category = $request->input('player_category');
        $level = $request->input('player_level');
        $q = trim((string) $request->input('q', ''));

        $query = Member::query()
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->whereIn('current_status', ['ACTIVE', 'INACTIVE']);

        if ($sportId !== null && $sportId > 0) {
            $query->where(function ($sub) use ($sportId): void {
                $sub->where('sport_id', $sportId)
                    ->orWhereHas('playableSports', fn ($ps) => $ps->where('sports.id', $sportId));
            });
        }

        if (! empty($category) && $category !== '_all') {
            $query->where('player_category', $category);
        }

        if (! empty($level) && $level !== '_all') {
            $query->where('player_level', $level);
        }

        // Inactive players: those who are not associated with any team right now
        $query->whereDoesntHave('teamMemberships', function ($tm): void {
            $tm->whereNull('left_on')
                ->whereHas('team', fn ($t) => $t->where('is_active', true)->whereNull('deleted_at'));
        });

        // Also ensure not already active on this team for the selected session
        if ($sessionId > 0) {
            $query->whereDoesntHave('teamMemberships', function ($tm) use ($team, $sessionId): void {
                $tm->where('team_id', $team->id)
                    ->where('session_id', $sessionId)
                    ->whereNull('left_on');
            });
        }

        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('full_name', 'like', "%{$q}%")
                    ->orWhere('pno', 'like', "%{$q}%")
                    ->orWhere('member_code', 'like', "%{$q}%");
            });
        }

        $members = $query->select([
            'id',
            'member_code',
            'pno',
            'full_name',
            'rank',
            'player_category',
            'player_level',
            'current_status',
            'sport_id',
        ])
            ->orderBy('full_name')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $members->map(fn (Member $m): array => [
                'id' => $m->id,
                'member_code' => $m->member_code,
                'pno' => $m->pno,
                'full_name' => $m->full_name,
                'rank' => $m->rank,
                'player_category' => $m->player_category,
                'player_level' => $m->player_level,
                'current_status' => $m->current_status,
                'active_team' => null,
            ]),
        ]);
    }

    public function store(StoreTeamMemberRequest $request, Team $team, TeamRosterService $roster): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $sessionId = (int) $data['session_id'];

        $role = $data['role'] ?? 'PLAYER';
        $joinedOn = $data['joined_on'] ?? null;

        $result = $roster->addMembers(
            team: $team,
            memberIds: $data['member_ids'],
            sessionId: $sessionId,
            role: $role,
            joinedOn: $joinedOn,
            userId: (int) $request->user()->id,
        );
        $this->teamSessionStatusManager->ensureActive($team, $sessionId);

        $message = match (true) {
            $result['sports_assigned'] === 0 => __('Members added to team.'),
            $result['sports_assigned'] === 1 => __('Members added to team. 1 sport profile updated.'),
            default => __('Members added to team. :count sport profiles updated.', ['count' => $result['sports_assigned']]),
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

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
