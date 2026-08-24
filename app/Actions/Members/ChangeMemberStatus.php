<?php

declare(strict_types=1);

namespace App\Actions\Members;

use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ChangeMemberStatus
{
    public function __construct(
        private readonly TeamSessionStatusManager $teamSessionStatusManager,
    ) {}

    /**
     * Change a member's status and close active team memberships when becoming non-active.
     *
     * @return array{memberships_closed: int}
     */
    public function __invoke(
        Member $member,
        string $status,
        string $effectiveOn,
        ?string $reason,
        int $userId,
    ): array {
        return DB::transaction(function () use ($member, $status, $effectiveOn, $reason, $userId): array {
            $membershipsClosed = $status !== 'ACTIVE'
                ? $this->closeActiveTeamMemberships($member, $effectiveOn, (string) $reason, $userId)
                : 0;

            MemberStatusHistory::create([
                'member_id' => $member->id,
                'status' => $status,
                'effective_on' => $effectiveOn,
                'reason' => $reason,
                'recorded_by' => $userId,
            ]);

            $member->update(['current_status' => $status]);

            return ['memberships_closed' => $membershipsClosed];
        });
    }

    /**
     * Close all active team memberships for the member and record movements.
     */
    private function closeActiveTeamMemberships(
        Member $member,
        string $effectiveOn,
        string $reason,
        int $userId,
    ): int {
        /** @var Collection<int, TeamMember> $rows */
        $rows = TeamMember::query()
            ->with('team:id,organization_id')
            ->where('member_id', $member->id)
            ->whereNull('left_on')
            ->get();

        foreach ($rows as $row) {
            $row->update(['left_on' => $effectiveOn]);

            TeamMemberMovement::create([
                'team_id' => $row->team_id,
                'member_id' => $row->member_id,
                'session_id' => $row->session_id,
                'team_member_id' => $row->id,
                'created_by' => $userId,
                'action' => 'REMOVED',
                'role' => $row->role,
                'effective_on' => $effectiveOn,
                'reason' => $reason,
                'source' => 'member_status_change',
                'metadata' => ['member_status_change' => true],
            ]);

            if ($row->team !== null) {
                $this->teamSessionStatusManager->markInactiveIfSessionEmpty(
                    $row->team,
                    $row->session_id,
                    $reason,
                );
            }
        }

        return $rows->count();
    }
}
