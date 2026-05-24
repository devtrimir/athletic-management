<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamMemberRequest;
use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamMemberController extends Controller
{
    public function store(StoreTeamMemberRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $memberIds = $data['member_ids'];

        $existing = TeamMember::where('team_id', $team->id)
            ->whereIn('member_id', $memberIds)
            ->pluck('member_id')
            ->all();

        if (! empty($existing)) {
            $errors = [];
            foreach ($existing as $id) {
                $index = array_search($id, $memberIds);
                $errors["member_ids.{$index}"] = __('This member is already on the team.');
            }

            return back()->withErrors($errors)->withInput();
        }

        $role = $data['role'] ?? 'PLAYER';
        $sessionId = $data['session_id'];
        $joinedOn = $data['joined_on'] ?? null;

        $rows = array_map(fn (int $memberId) => [
            'team_id' => $team->id,
            'member_id' => $memberId,
            'session_id' => $sessionId,
            'role' => $role,
            'joined_on' => $joinedOn,
            'left_on' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $memberIds);

        TeamMember::insert($rows);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Members added to team.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(Team $team, Member $member): RedirectResponse
    {
        Gate::authorize('update', $team);

        TeamMember::where('team_id', $team->id)
            ->where('member_id', $member->id)
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed from team.')]);

        return to_route('teams.show', $team);
    }
}
