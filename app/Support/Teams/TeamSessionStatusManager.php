<?php

declare(strict_types=1);

namespace App\Support\Teams;

use App\Models\Team;
use App\Models\TeamSessionStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class TeamSessionStatusManager
{
    public function ensureActive(Team $team, int $sessionId): TeamSessionStatus
    {
        return $this->setStatus($team, $sessionId, TeamSessionStatus::STATUS_ACTIVE, [
            'carried_forward_to_session_id' => null,
            'carried_forward_at' => null,
            'carried_forward_by' => null,
            'closed_at' => null,
            'closed_reason' => null,
        ]);
    }

    public function ensureInactive(Team $team, int $sessionId, ?string $reason = null): TeamSessionStatus
    {
        return $this->setStatus($team, $sessionId, TeamSessionStatus::STATUS_INACTIVE, [
            'closed_at' => now(),
            'closed_reason' => $reason,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function setStatus(Team $team, int $sessionId, string $status, array $attributes = []): TeamSessionStatus
    {
        return TeamSessionStatus::updateOrCreate(
            [
                'team_id' => $team->id,
                'session_id' => $sessionId,
            ],
            array_merge([
                'organization_id' => $team->organization_id,
                'status' => $status,
            ], $attributes),
        );
    }

    public function markCarriedForward(Team $team, int $sourceSessionId, int $targetSessionId, int $userId): TeamSessionStatus
    {
        return TeamSessionStatus::updateOrCreate(
            [
                'team_id' => $team->id,
                'session_id' => $sourceSessionId,
            ],
            [
                'organization_id' => $team->organization_id,
                'status' => TeamSessionStatus::STATUS_CARRIED_FORWARD,
                'carried_forward_to_session_id' => $targetSessionId,
                'carried_forward_at' => now(),
                'carried_forward_by' => $userId,
                'closed_at' => now(),
                'closed_reason' => __('Carried forward to the selected session.'),
            ],
        );
    }

    public function carryForward(Team $team, int $sourceSessionId, int $targetSessionId, int $userId): void
    {
        $this->markCarriedForward($team, $sourceSessionId, $targetSessionId, $userId);
        $this->ensureActive($team, $targetSessionId);
    }

    public function markInactiveIfSessionEmpty(Team $team, int $sessionId, ?string $reason = null): ?TeamSessionStatus
    {
        $hasActiveMembers = $team->teamMembers()
            ->where('session_id', $sessionId)
            ->whereNull('left_on')
            ->exists();

        $hasCurrentCoaches = $team->coachAssignments()
            ->where('session_id', $sessionId)
            ->where('is_current', true)
            ->exists();

        if ($hasActiveMembers || $hasCurrentCoaches) {
            return null;
        }

        $currentStatus = TeamSessionStatus::query()
            ->where('team_id', $team->id)
            ->where('session_id', $sessionId)
            ->first();

        if ($currentStatus?->status === TeamSessionStatus::STATUS_CARRIED_FORWARD) {
            return $currentStatus;
        }

        return $this->ensureInactive($team, $sessionId, $reason ?? __('No active players or coaches remain for this session.'));
    }

    public function statusFor(Team $team, int $sessionId): TeamSessionStatus
    {
        /** @var TeamSessionStatus|null $status */
        $status = $team->sessionStatuses()
            ->where('session_id', $sessionId)
            ->first();

        if ($status !== null) {
            return $status;
        }

        return $this->ensureFromLegacyTeam($team, $sessionId);
    }

    /**
     * @param  EloquentCollection<int, Team>|Collection<int, Team>  $teams
     * @return Collection<int, TeamSessionStatus>
     */
    public function statusesForTeams(EloquentCollection|Collection $teams, int $sessionId): Collection
    {
        if ($teams->isEmpty()) {
            return collect();
        }

        $teamIds = $teams->pluck('id')->map(fn (mixed $id): int => (int) $id)->all();

        $statuses = TeamSessionStatus::query()
            ->whereIn('team_id', $teamIds)
            ->where('session_id', $sessionId)
            ->get()
            ->keyBy('team_id');

        foreach ($teams as $team) {
            if (! $statuses->has($team->id)) {
                $statuses->put($team->id, $this->ensureFromLegacyTeam($team, $sessionId));
            }
        }

        return $statuses;
    }

    public function applySessionStatusFilter(Builder $query, int $sessionId, ?bool $active = null): Builder
    {
        return $query->whereHas('sessionStatuses', function (Builder $statusQuery) use ($sessionId, $active): void {
            $statusQuery->where('session_id', $sessionId);

            if ($active !== null) {
                $active
                    ? $statusQuery->where('status', TeamSessionStatus::STATUS_ACTIVE)
                    : $statusQuery->where('status', '!=', TeamSessionStatus::STATUS_ACTIVE);
            }
        });
    }

    private function ensureFromLegacyTeam(Team $team, int $sessionId): TeamSessionStatus
    {
        $status = $team->is_active && (int) $team->session_id === $sessionId
            ? TeamSessionStatus::STATUS_ACTIVE
            : TeamSessionStatus::STATUS_INACTIVE;

        return new TeamSessionStatus([
            'organization_id' => $team->organization_id,
            'team_id' => $team->id,
            'session_id' => $sessionId,
            'status' => $status,
        ]);
    }
}
