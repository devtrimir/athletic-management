<?php

declare(strict_types=1);

namespace App\Support\Teams;

use App\Http\Resources\TeamResource;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Incharge;
use App\Models\Member;
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
            'members' => $this->membersPayload($team, $selectedSessionId, false),
            'removedMembers' => $this->membersPayload($team, $selectedSessionId, true),
            'coaches' => $this->coachesPayload($team, $selectedSessionId),
            'removedCoaches' => $this->removedCoachesPayload($team, $selectedSessionId),
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
            'coaches' => $this->coachesPayload($team, $selectedSessionId),
        ];
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @return array<string, mixed>
     */
    public function printTeams(Collection $teams, int $organizationId, ?int $requestedSessionId = null): array
    {
        $firstTeam = $teams->first();
        $selectedSessionId = $firstTeam instanceof Team
            ? $this->selectedSessionId($firstTeam, $organizationId, $requestedSessionId)
            : (int) ($requestedSessionId ?? 0);

        return [
            'team' => $this->syntheticPrintTeam(),
            'sessions' => $this->sessions($organizationId),
            'selectedSessionId' => $selectedSessionId > 0 ? $selectedSessionId : null,
            'members' => [],
            'removedMembers' => [],
            'coaches' => [],
            'printTeams' => $teams
                ->values()
                ->map(fn (Team $team): array => $this->printTeamPayload($team, $selectedSessionId))
                ->all(),
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
            'removedCoaches' => $this->removedCoachesPayload($team, $selectedSessionId),
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
        return SportSession::select(['id', 'name', 'is_current', 'start_year'])
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
        $teamSportId = (int) $team->sport_id;
        $teamSportName = $team->sport?->name;

        return $team->teamMembers()
            ->with([
                'member:id,full_name,member_code,pno,player_category,rank,mobile,current_unit_id',
                'member.currentUnit:id,name',
                'member.playableSports' => fn ($query) => $query
                    ->select(['sports.id', 'sports.name'])
                    ->withPivot(['sport_event', 'weight', 'role', 'position']),
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
                    'full_name_normalized' => $teamMember->member->full_name_normalized,
                    'member_code' => $teamMember->member->member_code,
                    'pno' => $teamMember->member->pno,
                    'player_category' => $teamMember->member->player_category,
                    'rank' => $teamMember->member->rank,
                    'mobile' => $teamMember->member->mobile,
                    'playable_profile' => $this->memberPlayableProfile($teamMember->member, $teamSportId, $teamSportName),
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

    /**
     * @return array{sport_event: string|null, role: string|null, position: string|null, weight: string|null}|null
     */
    private function memberPlayableProfile(Member $member, int $teamSportId, ?string $teamSportName): ?array
    {
        if (! $member->relationLoaded('playableSports') || $teamSportId <= 0) {
            return null;
        }

        $sport = $member->playableSports->firstWhere('id', $teamSportId);

        if ($sport === null) {
            $sport = $member->playableSports()->whereKey($teamSportId)->first();
        }

        if ($sport === null) {
            return null;
        }

        $parsedSportEvent = $this->splitSportEventWeight(
            $sport->pivot?->sport_event,
            $teamSportName,
        );
        $profile = [
            'sport_event' => $parsedSportEvent['sport_event']
                ?? $this->withoutSportName($sport->pivot?->sport_event, $teamSportName),
            'weight' => filled($sport->pivot?->weight) ? (string) $sport->pivot->weight : $parsedSportEvent['weight'],
            'role' => filled($sport->pivot?->role) ? (string) $sport->pivot->role : null,
            'position' => filled($sport->pivot?->position) ? (string) $sport->pivot->position : null,
        ];

        return collect($profile)->filter()->isEmpty() ? null : $profile;
    }

    /**
     * @return array{sport_event: string|null, weight: string|null}
     */
    private function splitSportEventWeight(?string $sportEvent, ?string $teamSportName): array
    {
        $value = $this->withoutSportName($sportEvent, $teamSportName) ?? '';
        if ($value === '') {
            return ['sport_event' => null, 'weight' => null];
        }

        $normalized = preg_replace('/\h/u', ' ', trim($value)) ?? $value;
        $normalized = preg_replace('/\s+/u', ' ', (string) $normalized);

        $patterns = [
            '/^([0-9]+(?:\.[0-9]+)?\s*(?:कि\.?\s*ग्रा\.?|किग्रा|किलोग्राम|kg|kgs|k\.g\.?|kg\/kg|lbs|lb|pound|pounds))\s+(.+)$/u',
            '/^([०-९]+(?:\.[०-९]+)?\s*(?:कि\.?\s*ग्रा\.?|किग्रा|किलोग्राम|kg|kgs|k\.g\.?|kg\/kg|lbs|lb|pound|pounds))\s+(.+)$/u',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalized, $matches)) {
                return [
                    'weight' => trim($matches[1]),
                    'sport_event' => trim($matches[2]),
                ];
            }
        }

        $fallback = $this->splitByWeightPrefix($normalized);
        if ($fallback !== null) {
            return $fallback;
        }

        return ['sport_event' => $value, 'weight' => null];
    }

    /**
     * @return array{sport_event: string|null, weight: string|null}|null
     */
    private function splitByWeightPrefix(string $value): ?array
    {
        $parts = explode(' ', $value, 3);
        if (count($parts) < 3) {
            return null;
        }

        if (! preg_match('/^[0-9]+(?:\.[0-9]+)?$/u', $parts[0])) {
            return null;
        }

        if (! preg_match('/^(?:कि\.?\s*ग्रा\.?|किग्रा|किलोग्राम|kg|kgs|k\.g\.?|kg\/kg|lbs|lb|pound|pounds)$/iu', $parts[1])) {
            return null;
        }

        return [
            'weight' => trim($parts[0].' '.$parts[1]),
            'sport_event' => trim($parts[2]),
        ];
    }

    private function withoutSportName(mixed $value, ?string $sportName): ?string
    {
        $text = trim((string) ($value ?? ''));
        $sport = trim((string) ($sportName ?? ''));

        if ($text === '') {
            return null;
        }

        if ($sport !== '' && str_starts_with(mb_strtolower($text), mb_strtolower($sport))) {
            $text = trim(mb_substr($text, mb_strlen($sport)));
            $text = trim($text, " \t\n\r\0\x0B-/:|");
        }

        return $text !== '' ? $text : null;
    }

    /** @return array<int, array<string, mixed>> */
    private function coachesPayload(Team $team, int $selectedSessionId): array
    {
        $teamSportId = (int) $team->sport_id;
        $teamSportName = $team->sport?->name;

        return $team->coachAssignments()
            ->with([
                'coach' => fn ($query) => $query
                    ->select(['id', 'full_name', 'display_name', 'pno'])
                    ->with(['sports' => fn ($query) => $query
                        ->select(['sports.id', 'sports.name'])
                        ->where('sports.id', $teamSportId)
                        ->withPivot(['sport_event', 'level'])]),
                'session:id,name',
            ])
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
                    'display_name' => $coachAssignment->coach->display_name,
                    'pno' => $coachAssignment->coach->pno,
                    'sport_profile' => $this->coachSportProfile($coachAssignment->coach, $teamSportName),
                ] : null,
                'session' => $coachAssignment->session ? [
                    'id' => $coachAssignment->session->id,
                    'name' => $coachAssignment->session->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function removedCoachesPayload(Team $team, int $selectedSessionId): array
    {
        $teamSportId = (int) $team->sport_id;

        return $team->coachAssignments()
            ->with([
                'coach' => fn ($query) => $query
                    ->select(['id', 'full_name', 'display_name', 'pno'])
                    ->with(['sports' => fn ($query) => $query
                        ->select(['sports.id', 'sports.name'])
                        ->where('sports.id', $teamSportId)
                        ->withPivot(['sport_event', 'level'])]),
                'session:id,name',
            ])
            ->where('session_id', $selectedSessionId)
            ->historical()
            ->orderByDesc('removed_at')
            ->orderBy('id')
            ->get()
            ->map(fn (CoachAssignment $coachAssignment): array => [
                'id' => $coachAssignment->id,
                'role' => $coachAssignment->role,
                'assigned_at' => $coachAssignment->assigned_at?->toDateString(),
                'removed_at' => $coachAssignment->removed_at?->toDateString(),
                'coach' => $coachAssignment->coach ? [
                    'id' => $coachAssignment->coach->id,
                    'full_name' => $coachAssignment->coach->full_name,
                    'display_name' => $coachAssignment->coach->display_name,
                    'pno' => $coachAssignment->coach->pno,
                ] : null,
                'session' => $coachAssignment->session ? [
                    'id' => $coachAssignment->session->id,
                    'name' => $coachAssignment->session->name,
                ] : null,
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function printTeamPayload(Team $team, int $selectedSessionId): array
    {
        $team->loadMissing([
            'sport:id,name',
            'session:id,name',
            'district:id,name',
            'unit:id,name,district_id',
            'currentInchargeAssignment',
        ]);

        return [
            'team' => (new TeamResource($team))->resolve(),
            'members' => $this->membersPayload($team, $selectedSessionId, false),
            'removedMembers' => $this->membersPayload($team, $selectedSessionId, true),
            'coaches' => $this->coachesPayload($team, $selectedSessionId),
        ];
    }

    /** @return array<string, mixed> */
    private function syntheticPrintTeam(): array
    {
        return [
            'id' => 0,
            'name' => __('Teams'),
            'in_charge' => null,
            'has_current_incharge' => false,
            'current_incharge_rank' => null,
            'current_incharge_name' => null,
            'current_incharge_pno' => null,
            'current_incharge_mobile' => null,
            'sport' => null,
            'location_label' => null,
        ];
    }

    /**
     * @return array{sport_event: string|null, level: string|null}|null
     */
    private function coachSportProfile(Coach $coach, ?string $teamSportName): ?array
    {
        $sport = $coach->relationLoaded('sports') ? $coach->sports->first() : null;
        if ($sport === null) {
            return null;
        }

        $profile = [
            'sport_event' => $this->withoutSportName($sport->pivot?->sport_event, $teamSportName),
            'level' => filled($sport->pivot?->level) ? (string) $sport->pivot->level : null,
        ];

        return collect($profile)->filter()->isEmpty() ? null : $profile;
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
                'incharge_id' => $assignment->incharge_id,
                'full_name' => $assignment->full_name,
                'pno' => $assignment->pno,
                'rank' => $assignment->rank,
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
            ->get(['id', 'full_name', 'pno', 'rank', 'mobile', 'email'])
            ->all();
    }
}
