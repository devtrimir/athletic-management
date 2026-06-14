<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\CloneTeamRequest;
use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamCloneController extends Controller
{
    public function __invoke(CloneTeamRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validated();
        $targetSessionId = (int) $data['session_id'];
        $memberRowIds = $data['member_ids'] ?? [];
        $coachRowIds = $data['coach_ids'] ?? [];

        // Create the new team — unique constraint (org, sport, session, unit, name)
        // may fire if a team with the same identity already exists for the target session.
        $newTeam = DB::transaction(function () use ($team, $targetSessionId, $memberRowIds, $coachRowIds): Team {
            $newTeam = Team::create([
                'organization_id' => $team->organization_id,
                'sport_id' => $team->sport_id,
                'unit_id' => $team->unit_id,
                'session_id' => $targetSessionId,
                'name' => $team->name,
                'in_charge' => $team->in_charge,
            ]);

            // Copy selected members — skip any whose (member_id, session_id) already
            // exists in another team for the target session.
            $skippedMembers = 0;
            if (! empty($memberRowIds)) {
                $rows = TeamMember::whereIn('id', $memberRowIds)
                    ->where('team_id', $team->id)
                    ->get(['member_id', 'role', 'joined_on']);

                $conflictMemberIds = TeamMember::where('session_id', $targetSessionId)
                    ->whereIn('member_id', $rows->pluck('member_id'))
                    ->whereHas('team', fn ($query) => $query->where('sport_id', $team->sport_id))
                    ->pluck('member_id')
                    ->flip();

                $eligibleMemberIds = Member::whereIn('id', $rows->pluck('member_id'))
                    ->where('current_status', 'ACTIVE')
                    ->whereHas('playableSports', fn ($query) => $query->where('sports.id', $team->sport_id))
                    ->pluck('id')
                    ->flip();

                $insertRows = [];
                foreach ($rows as $row) {
                    if ($conflictMemberIds->has($row->member_id) || ! $eligibleMemberIds->has($row->member_id)) {
                        $skippedMembers++;

                        continue;
                    }

                    $insertRows[] = [
                        'team_id' => $newTeam->id,
                        'member_id' => $row->member_id,
                        'session_id' => $targetSessionId,
                        'role' => $row->role,
                        'joined_on' => $row->joined_on,
                        'left_on' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                if (! empty($insertRows)) {
                    TeamMember::insert($insertRows);
                }

                if ($skippedMembers > 0) {
                    Inertia::flash('toast', [
                        'type' => 'warning',
                        'message' => trans_choice(
                            ':count player(s) skipped — already in another team for the target session.',
                            $skippedMembers,
                            ['count' => $skippedMembers]
                        ),
                    ]);
                }
            }

            // Copy selected coaches — skip any whose (coach_id, session_id) already exists.
            $skippedCoaches = 0;
            if (! empty($coachRowIds)) {
                $rows = CoachAssignment::whereIn('id', $coachRowIds)
                    ->where('team_id', $team->id)
                    ->get(['coach_id', 'role']);

                $conflictCoachIds = CoachAssignment::where('session_id', $targetSessionId)
                    ->whereIn('coach_id', $rows->pluck('coach_id'))
                    ->pluck('coach_id')
                    ->flip();

                $insertRows = [];
                foreach ($rows as $row) {
                    if ($conflictCoachIds->has($row->coach_id)) {
                        $skippedCoaches++;

                        continue;
                    }

                    $insertRows[] = [
                        'team_id' => $newTeam->id,
                        'coach_id' => $row->coach_id,
                        'session_id' => $targetSessionId,
                        'role' => $row->role,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                if (! empty($insertRows)) {
                    CoachAssignment::insert($insertRows);
                }

                if ($skippedCoaches > 0) {
                    Inertia::flash('toast', [
                        'type' => 'warning',
                        'message' => trans_choice(
                            ':count coach(es) skipped — already in another team for the target session.',
                            $skippedCoaches,
                            ['count' => $skippedCoaches]
                        ),
                    ]);
                }
            }

            return $newTeam;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team cloned successfully.')]);

        return to_route('teams.show', $newTeam);
    }
}
