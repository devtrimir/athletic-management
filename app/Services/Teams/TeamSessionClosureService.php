<?php

declare(strict_types=1);

namespace App\Services\Teams;

use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;
use App\Models\TeamSessionStatus;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Support\Facades\DB;

class TeamSessionClosureService
{
    public function __construct(private TeamSessionStatusManager $teamSessionStatusManager) {}

    /**
     * @param  list<int>  $exceptTeamMemberIds
     * @return array{members_closed: int, members_marked_inactive: int, coaches_removed: int}
     */
    public function closeSession(
        Team $team,
        int $sessionId,
        string $closedOn,
        string $reason,
        int $userId,
        bool $removeCoaches = false,
        string $source = 'session_closure',
        bool $markSessionInactive = true,
        array $exceptTeamMemberIds = [],
        bool $removeMembers = true,
    ): array {
        return DB::transaction(function () use ($team, $sessionId, $closedOn, $reason, $userId, $removeCoaches, $source, $markSessionInactive, $exceptTeamMemberIds, $removeMembers): array {
            if ($markSessionInactive) {
                $this->teamSessionStatusManager->ensureInactive($team, $sessionId, $reason);
            } else {
                $this->teamSessionStatusManager->setStatus($team, $sessionId, TeamSessionStatus::STATUS_CARRIED_FORWARD, [
                    'closed_at' => now(),
                    'closed_reason' => $reason,
                ]);
            }

            $rows = collect();
            $membersMarkedInactive = 0;
            if ($removeMembers) {
                $rows = $team->teamMembers()
                    ->where('session_id', $sessionId)
                    ->whereNull('left_on')
                    ->when($exceptTeamMemberIds !== [], fn ($query) => $query->whereNotIn('id', $exceptTeamMemberIds))
                    ->get();

                foreach ($rows as $row) {
                    /** @var TeamMember $row */
                    $row->update(['left_on' => $closedOn]);

                    TeamMemberMovement::create([
                        'team_id' => $team->id,
                        'member_id' => $row->member_id,
                        'session_id' => $sessionId,
                        'team_member_id' => $row->id,
                        'created_by' => $userId,
                        'action' => 'REMOVED',
                        'role' => $row->role,
                        'effective_on' => $closedOn,
                        'reason' => $reason,
                        'source' => $source,
                    ]);
                }

                $memberIds = $rows->pluck('member_id')->unique()->values();
                Member::whereIn('id', $memberIds)
                    ->where('current_status', '!=', 'INACTIVE')
                    ->get()
                    ->each(function (Member $member) use ($closedOn, $reason, $userId, &$membersMarkedInactive): void {
                        MemberStatusHistory::create([
                            'member_id' => $member->id,
                            'status' => 'INACTIVE',
                            'effective_on' => $closedOn,
                            'reason' => $reason,
                            'recorded_by' => $userId,
                        ]);

                        $member->update(['current_status' => 'INACTIVE']);
                        $membersMarkedInactive++;
                    });
            }

            $coachesRemoved = 0;

            if ($removeCoaches) {
                $coachesRemoved = CoachAssignment::where('team_id', $team->id)
                    ->where('session_id', $sessionId)
                    ->where('is_current', true)
                    ->update([
                        'is_current' => false,
                        'removed_at' => $closedOn,
                        'notes' => $reason,
                    ]);
            }

            return [
                'members_closed' => $rows->count(),
                'members_marked_inactive' => $membersMarkedInactive,
                'coaches_removed' => $coachesRemoved,
            ];
        });
    }
}
