<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberAchievementFromContextRequest;
use App\Models\Achievement;
use App\Models\Member;
use App\Models\Participation;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Members\TournamentEventContextResolver;
use App\Support\Participations\ParticipationTeamResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MemberAchievementContextController extends Controller
{
    public function __construct(
        private readonly TournamentEventContextResolver $resolver,
        private readonly ParticipationTeamResolver $participationTeamResolver,
    ) {}

    public function store(StoreMemberAchievementFromContextRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageBenefits', $member);

        $validated = $request->validated();
        $createContextIfMissing = (string) ($validated['reuse_mode'] ?? 'auto') === 'auto';
        $medalType = (string) ($validated['medal_type'] ?? '');
        $position = $validated['position'] ?? $validated['medal_position'] ?? null;
        $position = is_string($position) ? ((int) $position) : $position;

        if (in_array($medalType, ['GOLD', 'SILVER', 'BRONZE'], true)) {
            $position = ['GOLD' => 1, 'SILVER' => 2, 'BRONZE' => 3][$medalType];
        }

        $storeResult = DB::transaction(function () use (
            $validated,
            $member,
            $createContextIfMissing,
            $position,
            $medalType
        ): array {
            $eventType = (string) ($validated['event_type'] ?? 'individual');
            $teamId = (int) ($validated['team_id'] ?? 0);
            $teamParticipation = $eventType === 'team';
            $createdContext = $this->resolver->resolveOrCreate($member, $validated, $createContextIfMissing);
            $event = $createdContext['event'];
            $sessionId = (int) (($validated['session_id'] ?? 0) ?: ($event->tournament->session_id ?? 0));

            if ($teamId > 0 && $sessionId <= 0) {
                $sessionId = (int) (Team::query()->whereKey($teamId)->value('session_id') ?? 0);

                if ($sessionId <= 0) {
                    throw ValidationException::withMessages([
                        'session_id' => __('Session is required to add member to selected team.'),
                    ]);
                }
            }

            if ($teamId <= 0) {
                $teamId = $this->resolveTeamForContext(
                    $member,
                    $event,
                    (bool) $validated['is_historical_session'],
                );

                if ($teamId <= 0 && ! $teamParticipation) {
                    $teamId = $this->participationTeamResolver->resolveTeamId(
                        (int) $member->id,
                        $sessionId,
                        (int) ($event->sport_id ?? 0),
                    ) ?? 0;
                }

                if ($teamParticipation && ! (bool) $validated['is_historical_session'] && $teamId <= 0) {
                    throw ValidationException::withMessages([
                        'team_id' => __('Team is required for team events in this session and sport. Please select a team manually.'),
                    ]);
                }
            }

            if (
                $teamParticipation
                && $teamId > 0
                && $sessionId <= 0
                && ! (bool) $validated['is_historical_session']
            ) {
                throw ValidationException::withMessages([
                    'session_id' => __('Session is required to assign team members for team events.'),
                ]);
            }

            $memberId = $member->id;
            $teamIdForEnrollment = $teamId;
            $teamAutoResolved = (bool) (
                $validated['team_auto_resolved'] ?? false
            ) || ((int) ($validated['team_id'] ?? 0) === 0 && $teamId > 0);
            $team = $teamIdForEnrollment > 0 ? Team::query()->find($teamIdForEnrollment) : null;

            $lookup = [
                'event_id' => $event->id,
                'member_id' => $memberId,
            ];

            $participation = Participation::updateOrCreate(
                $lookup,
                [
                    'session_id' => $sessionId,
                    'position' => $position,
                    'member_id' => $memberId,
                    'team_id' => $teamId > 0 ? $teamId : null,
                    'lineup_member_ids' => null,
                ],
            );

            if ($teamIdForEnrollment > 0) {
                $teamMember = TeamMember::query()
                    ->firstOrNew([
                        'team_id' => $teamIdForEnrollment,
                        'member_id' => $member->id,
                        'session_id' => $sessionId,
                    ]);

                if ($teamMember->role !== 'PLAYER') {
                    $teamMember->role = 'PLAYER';
                }

                if ($teamMember->exists === false) {
                    $teamMember->joined_on = null;
                    $teamMember->left_on = null;
                }

                $teamMember->save();
            }

            if (! empty($medalType)) {
                Achievement::updateOrCreate(
                    ['participation_id' => $participation->id],
                    [
                        'medal_type' => $medalType,
                        'position' => $position,
                        'remarks' => $validated['remarks'] ?? null,
                    ],
                );

                return [
                    'created_context' => $createdContext,
                    'team' => $team,
                    'team_auto_resolved' => $teamAutoResolved,
                ];
            }

            $participation->achievement?->delete();

            return [
                'created_context' => $createdContext,
                'team' => $team,
                'team_auto_resolved' => $teamAutoResolved,
            ];
        });

        $autoMappedMessage = '';
        if ($storeResult['team_auto_resolved'] && $storeResult['team'] !== null) {
            $autoMappedMessage = ' '.__(
                'Auto-mapped to active team :team.',
                ['team' => $storeResult['team']->name],
            );
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(
                $storeResult['created_context']['tournament_created'] || $storeResult['created_context']['event_created']
                    ? 'Achievement context auto-created and recorded.'.$autoMappedMessage
                    : 'Achievement saved.'.$autoMappedMessage,
            ),
        ]);

        return to_route('members.events', $member);
    }

    private function resolveTeamForContext(Member $member, mixed $event, bool $isHistorical): int
    {
        $eventSportId = (int) ($event->sport_id);
        if ($eventSportId <= 0) {
            return 0;
        }

        $sessionId = (int) ($event->tournament->session_id);
        if ($sessionId <= 0) {
            return 0;
        }

        $query = Team::query()
            ->where('organization_id', (int) $member->organization_id)
            ->where('sport_id', $eventSportId)
            ->where('session_id', $sessionId);

        if (! $isHistorical) {
            $query->where('is_active', true);
        }

        $candidates = $query->pluck('id');

        if ($candidates->count() !== 1) {
            return 0;
        }

        return (int) $candidates->first();
    }
}
