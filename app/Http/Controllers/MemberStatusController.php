<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\ChangeStatusRequest;
use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberStatusController extends Controller
{
    public function __construct(
        private readonly TeamSessionStatusManager $teamSessionStatusManager,
    ) {}

    public function store(ChangeStatusRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('changeStatus', $member);

        $data = $request->validated();

        DB::transaction(function () use ($data, $member, $request): void {
            if ($data['status'] !== 'ACTIVE') {
                $this->closeActiveTeamMemberships(
                    member: $member,
                    effectiveOn: (string) $data['effective_on'],
                    reason: (string) $data['reason'],
                    userId: (int) $request->user()->id,
                );
            }

            MemberStatusHistory::create([
                'member_id' => $member->id,
                'status' => $data['status'],
                'effective_on' => $data['effective_on'],
                'reason' => $data['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $member->update(['current_status' => $data['status']]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Status updated.')]);

        return to_route('members.status', $member);
    }

    private function closeActiveTeamMemberships(Member $member, string $effectiveOn, string $reason, int $userId): void
    {
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
                $this->teamSessionStatusManager->markInactiveIfSessionEmpty($row->team, $row->session_id, $reason);
            }
        }
    }
}
