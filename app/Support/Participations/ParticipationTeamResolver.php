<?php

declare(strict_types=1);

namespace App\Support\Participations;

use App\Models\Scopes\BelongsToOrganization;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParticipationTeamResolver
{
    /**
     * Resolve the team an individual member participates through in a session.
     *
     * Considers the member's active team memberships (left_on IS NULL) in the
     * session and picks, in order: the single membership whose team plays the
     * event's sport; otherwise the single active membership when unambiguous;
     * otherwise the earliest joined membership (ties broken by lowest id).
     * Returns null when the member has no active membership in the session.
     */
    public function resolveTeamId(int $memberId, int $sessionId, ?int $eventSportId): ?int
    {
        if ($memberId <= 0 || $sessionId <= 0) {
            return null;
        }

        $memberships = TeamMember::query()
            ->where('member_id', $memberId)
            ->where('session_id', $sessionId)
            ->whereNull('left_on')
            ->with([
                // The org scope matches nothing without an authenticated user
                // (migrations, queues); memberships already scope the teams.
                'team' => fn (BelongsTo $query) => $query
                    ->withoutGlobalScope(BelongsToOrganization::class)
                    ->select(['id', 'sport_id']),
            ])
            ->get(['id', 'team_id', 'joined_on']);

        if ($memberships->isEmpty()) {
            return null;
        }

        $eventSportId = (int) ($eventSportId ?? 0);
        $sportMatches = $memberships
            ->filter(fn (TeamMember $membership): bool => $eventSportId > 0
                && (int) ($membership->team?->sport_id ?? 0) === $eventSportId)
            ->values();

        if ($sportMatches->count() === 1) {
            return (int) $sportMatches->first()->team_id;
        }

        if ($sportMatches->isEmpty() && $memberships->count() === 1) {
            return (int) $memberships->first()->team_id;
        }

        $pool = $sportMatches->isNotEmpty() ? $sportMatches : $memberships;

        $pick = $pool
            ->sortBy(fn (TeamMember $membership): array => [
                $membership->joined_on?->toDateString() ?? '9999-12-31',
                $membership->id,
            ])
            ->first();

        return $pick === null ? null : (int) $pick->team_id;
    }
}
