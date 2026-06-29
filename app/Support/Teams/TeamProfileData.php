<?php

declare(strict_types=1);

namespace App\Support\Teams;

use App\Http\Resources\TeamResource;
use App\Models\CoachAssignment;
use App\Models\Incharge;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;
use App\Services\AuditLogBuilder;
use Illuminate\Support\Collection;

class TeamProfileData
{
    public function __construct(
        private readonly AuditLogBuilder $auditLogBuilder,
        private readonly TeamSessionStatusManager $teamSessionStatusManager,
    ) {}

    /** @return array<string, mixed> */
    public function overview(Team $team, int $organizationId, ?int $requestedSessionId = null): array
    {
        $selectedSessionId = $this->selectedSessionId($team, $organizationId, $requestedSessionId);

        return [
            ...$this->shell($team, $organizationId, $selectedSessionId),
            'activeTab' => 'overview',
            'counts' => $this->countsPayload($team, $selectedSessionId),
        ];
    }

    /** @return array<string, mixed> */
    public function players(Team $team, int $organizationId, ?int $requestedSessionId = null): array
    {
        $selectedSessionId = $this->selectedSessionId($team, $organizationId, $requestedSessionId);

        return [
            ...$this->shell($team, $organizationId, $selectedSessionId),
            'activeTab' => 'players',
            'counts' => $this->countsPayload($team, $selectedSessionId),
            'members' => $this->membersPayload($team, $selectedSessionId, false),
            'removedMembers' => $this->membersPayload($team, $selectedSessionId, true),
            'memberMovements' => $this->memberMovementsPayload($team, $selectedSessionId),
        ];
    }

    /** @return array<string, mixed> */
    public function coaches(Team $team, int $organizationId, ?int $requestedSessionId = null): array
    {
        $selectedSessionId = $this->selectedSessionId($team, $organizationId, $requestedSessionId);

        return [
            ...$this->shell($team, $organizationId, $selectedSessionId),
            'activeTab' => 'coaches',
            'counts' => $this->countsPayload($team, $selectedSessionId),
            'coaches' => $this->coachesPayload($team, $selectedSessionId),
        ];
    }

    /** @return array<string, mixed> */
    public function incharge(Team $team, int $organizationId, ?int $requestedSessionId = null): array
    {
        $selectedSessionId = $this->selectedSessionId($team, $organizationId, $requestedSessionId);

        return [
            ...$this->shell($team, $organizationId, $selectedSessionId),
            'activeTab' => 'incharge',
            'inchargeHistory' => $this->inchargeHistoryPayload($team),
            'incharges' => $this->inchargesPayload(),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Team $team, int $organizationId, ?int $requestedSessionId = null): array
    {
        $selectedSessionId = $this->selectedSessionId($team, $organizationId, $requestedSessionId);

        return [
            ...$this->shell($team, $organizationId, $selectedSessionId),
            'activeTab' => 'changelog',
            'auditLog' => $this->auditLogBuilder->forTeam($team),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Team $team, int $organizationId, int $selectedSessionId): array
    {
        $team->loadMissing([
            'sport:id,name',
            'session:id,name',
            'district:id,name',
            'unit:id,name,district_id',
            'currentInchargeAssignment',
        ]);

        $sessionStatus = $this->teamSessionStatusManager->statusFor($team, $selectedSessionId);

        return [
            'team' => (new TeamResource($team))->resolve(),
            'sessions' => $this->sessions($organizationId),
            'selectedSessionId' => $selectedSessionId,
            'sessionStatus' => [
                'status' => $sessionStatus->status,
                'label' => match ($sessionStatus->status) {
                    'active' => __('Active'),
                    'carried_forward' => __('Carried forward'),
                    default => __('Inactive'),
                },
                'carried_forward_to_session_id' => $sessionStatus->carried_forward_to_session_id,
                'carried_forward_at' => $sessionStatus->carried_forward_at?->toDateTimeString(),
                'closed_at' => $sessionStatus->closed_at?->toDateTimeString(),
                'closed_reason' => $sessionStatus->closed_reason,
            ],
            'incharges' => [],
        ];
    }

    /** @return Collection<int, SportSession> */
    private function sessions(int $organizationId): Collection
    {
        return SportSession::select(['id', 'name', 'is_current'])
            ->where('organization_id', $organizationId)
            ->orderByDesc('start_year')
            ->orderByDesc('id')
            ->get();
    }

    private function selectedSessionId(Team $team, int $organizationId, ?int $requestedSessionId): int
    {
        if ($requestedSessionId !== null && $requestedSessionId > 0) {
            return $requestedSessionId;
        }

        return (int) (
            SportSession::where('organization_id', $organizationId)
                ->where('is_current', true)
                ->value('id')
            ?? $team->session_id
        );
    }

    /** @return array{players_count:int,coaches_count:int} */
    private function countsPayload(Team $team, int $selectedSessionId): array
    {
        return [
            'players_count' => $team->teamMembers()
                ->where('session_id', $selectedSessionId)
                ->whereNull('left_on')
                ->count(),
            'coaches_count' => $team->coachAssignments()
                ->where('session_id', $selectedSessionId)
                ->current()
                ->count(),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function membersPayload(Team $team, int $selectedSessionId, bool $removed): array
    {
        return $team->teamMembers()
            ->with([
                'member:id,full_name,member_code,pno,rank,designation,mobile,current_unit_id',
                'member.currentUnit:id,name',
                'session:id,name',
            ])
            ->where('session_id', $selectedSessionId)
            ->when($removed, fn ($query) => $query->whereNotNull('left_on'), fn ($query) => $query->whereNull('left_on'))
            ->when($removed, fn ($query) => $query->orderByDesc('left_on'), fn ($query) => $query->orderBy('id'))
            ->get()
            ->map(fn (TeamMember $teamMember): array => [
                'id' => $teamMember->id,
                'role' => $teamMember->role,
                'joined_on' => $teamMember->joined_on?->toDateString(),
                'left_on' => $teamMember->left_on?->toDateString(),
                'member' => $teamMember->member ? [
                    'id' => $teamMember->member->id,
                    'full_name' => $teamMember->member->full_name,
                    'member_code' => $teamMember->member->member_code,
                    'pno' => $teamMember->member->pno,
                    'rank' => $teamMember->member->rank,
                    'designation' => $teamMember->member->designation,
                    'mobile' => $teamMember->member->mobile,
                    'current_unit' => $teamMember->member->currentUnit ? [
                        'id' => $teamMember->member->currentUnit->id,
                        'name' => $teamMember->member->currentUnit->name,
                    ] : null,
                ] : null,
                'session' => $teamMember->session ? [
                    'id' => $teamMember->session->id,
                    'name' => $teamMember->session->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function coachesPayload(Team $team, int $selectedSessionId): array
    {
        return $team->coachAssignments()
            ->with(['coach:id,full_name,pno', 'session:id,name'])
            ->where('session_id', $selectedSessionId)
            ->current()
            ->orderBy('id')
            ->get()
            ->map(fn (CoachAssignment $coachAssignment): array => [
                'id' => $coachAssignment->id,
                'role' => $coachAssignment->role,
                'assigned_at' => $coachAssignment->assigned_at?->toDateString(),
                'coach' => $coachAssignment->coach ? [
                    'id' => $coachAssignment->coach->id,
                    'full_name' => $coachAssignment->coach->full_name,
                    'pno' => $coachAssignment->coach->pno,
                ] : null,
                'session' => $coachAssignment->session ? [
                    'id' => $coachAssignment->session->id,
                    'name' => $coachAssignment->session->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function memberMovementsPayload(Team $team, int $selectedSessionId): array
    {
        return TeamMemberMovement::query()
            ->where('team_id', $team->id)
            ->where('session_id', $selectedSessionId)
            ->with(['member:id,full_name,member_code,pno', 'createdBy:id,name'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (TeamMemberMovement $movement): array => [
                'id' => $movement->id,
                'action' => $movement->action,
                'role' => $movement->role,
                'effective_on' => $movement->effective_on?->toDateString(),
                'reason' => $movement->reason,
                'source' => $movement->source,
                'batch_uuid' => $movement->batch_uuid,
                'created_at' => $movement->created_at?->toDateTimeString(),
                'member' => $movement->member ? [
                    'id' => $movement->member->id,
                    'full_name' => $movement->member->full_name,
                    'member_code' => $movement->member->member_code,
                    'pno' => $movement->member->pno,
                ] : null,
                'created_by' => $movement->createdBy ? [
                    'id' => $movement->createdBy->id,
                    'name' => $movement->createdBy->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function inchargeHistoryPayload(Team $team): array
    {
        return TeamInchargeAssignment::query()
            ->where('team_id', $team->id)
            ->with(['assignedBy:id,name', 'removedBy:id,name'])
            ->latest('assigned_at')
            ->get()
            ->map(fn (TeamInchargeAssignment $assignment): array => [
                'id' => $assignment->id,
                'full_name' => $assignment->full_name,
                'pno' => $assignment->pno,
                'rank' => $assignment->rank,
                'designation' => $assignment->designation,
                'mobile' => $assignment->mobile,
                'email' => $assignment->email,
                'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
                'removed_at' => $assignment->removed_at?->toDateTimeString(),
                'assignment_reason' => $assignment->assignment_reason,
                'removal_reason' => $assignment->removal_reason,
                'remarks' => $assignment->remarks,
                'is_current' => $assignment->is_current,
                'assigned_by' => $assignment->assignedBy ? [
                    'id' => $assignment->assignedBy->id,
                    'name' => $assignment->assignedBy->name,
                ] : null,
                'removed_by' => $assignment->removedBy ? [
                    'id' => $assignment->removedBy->id,
                    'name' => $assignment->removedBy->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function inchargesPayload(): array
    {
        return Incharge::active()
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'pno', 'rank', 'designation', 'mobile', 'email'])
            ->all();
    }
}
