<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamMemberRequest;
use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamMemberController extends Controller
{
    public function store(StoreTeamMemberRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $memberIds = $data['member_ids'];
        $sessionId = $data['session_id'];

        // Check: already on THIS team.
        $onThisTeam = TeamMember::where('team_id', $team->id)
            ->whereIn('member_id', $memberIds)
            ->pluck('member_id')
            ->all();

        // Check: already on ANY team for this session (cross-team uniqueness).
        $crossTeamConflicts = TeamMember::with(['team:id,name_hi', 'member:id,full_name_hi'])
            ->where('session_id', $sessionId)
            ->whereIn('member_id', $memberIds)
            ->get(['member_id', 'team_id']);

        $errors = [];

        foreach ($onThisTeam as $id) {
            $index = array_search($id, $memberIds);
            $errors["member_ids.{$index}"] = __('This member is already on the team.');
        }

        foreach ($crossTeamConflicts as $conflict) {
            if (in_array($conflict->member_id, $onThisTeam, true)) {
                continue; // already reported above
            }
            $index = array_search($conflict->member_id, $memberIds);
            $teamName = (string) $conflict->team->name_hi;
            $memberName = (string) $conflict->member->full_name_hi;
            $errors["member_ids.{$index}"] = __(':name is already assigned to team :team for this session.', [
                'name' => $memberName,
                'team' => $teamName,
            ]);
        }

        if (! empty($errors)) {
            return back()->withErrors($errors)->withInput();
        }

        $role = $data['role'] ?? 'PLAYER';
        $joinedOn = $data['joined_on'] ?? null;

        foreach ($memberIds as $memberId) {
            TeamMember::create([
                'team_id' => $team->id,
                'member_id' => $memberId,
                'session_id' => $sessionId,
                'role' => $role,
                'joined_on' => $joinedOn,
                'left_on' => null,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Members added to team.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(Team $team, Member $member): RedirectResponse
    {
        Gate::authorize('update', $team);

        $tm = TeamMember::where('team_id', $team->id)
            ->where('member_id', $member->id)
            ->first();

        $tm?->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed from team.')]);

        return to_route('teams.show', $team);
    }

    public function bulkDestroy(Request $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $memberIds = $request->validate([
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => ['integer'],
        ])['member_ids'];

        $rows = TeamMember::where('team_id', $team->id)
            ->whereIn('member_id', $memberIds)
            ->get();

        foreach ($rows as $row) {
            $row->delete();
        }

        $deleted = $rows->count();

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count members removed from team.', ['count' => $deleted])]);

        return to_route('teams.show', $team);
    }
}
