<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\CloneTeamRequest;
use App\Models\CoachAssignment;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Teams\TeamRosterService;
use App\Support\Teams\TeamSessionStatusManager;
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

        DB::transaction(function () use ($request, $team, $targetSessionId, $memberRowIds, $coachRowIds): void {
            app(TeamSessionStatusManager::class)->carryForward(
                $team,
                (int) $team->session_id,
                $targetSessionId,
                (int) $request->user()->id,
            );

            $skippedMembers = 0;
            if (! empty($memberRowIds)) {
                $rows = TeamMember::whereIn('id', $memberRowIds)
                    ->where('team_id', $team->id)
                    ->get();

                $result = (new TeamRosterService)->carryForwardMembers(
                    $team,
                    $rows,
                    $targetSessionId,
                    (int) $request->user()->id,
                );
                $skippedMembers = $result['skipped'];

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

            $skippedCoaches = 0;
            if (! empty($coachRowIds)) {
                $rows = CoachAssignment::whereIn('id', $coachRowIds)
                    ->where('team_id', $team->id)
                    ->where('is_current', true)
                    ->get(['coach_id', 'role']);

                $existingCoachIds = CoachAssignment::where('session_id', $targetSessionId)
                    ->where('is_current', true)
                    ->whereIn('coach_id', $rows->pluck('coach_id'))
                    ->pluck('coach_id')
                    ->flip();

                $insertRows = [];
                foreach ($rows as $row) {
                    if ($existingCoachIds->has($row->coach_id)) {
                        $skippedCoaches++;

                        continue;
                    }

                    $insertRows[] = [
                        'team_id' => $team->id,
                        'coach_id' => $row->coach_id,
                        'session_id' => $targetSessionId,
                        'role' => $row->role,
                        'assigned_at' => now(),
                        'is_current' => true,
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
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team roster carried forward successfully.')]);

        return to_route('teams.show', ['team' => $team, 'filter' => ['session_id' => $targetSessionId]]);
    }
}
