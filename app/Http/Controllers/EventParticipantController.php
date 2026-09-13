<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\EventParticipants\StoreEventParticipantsRequest;
use App\Http\Requests\EventParticipants\UpdateParticipantRequest;
use App\Models\Achievement;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Tournament;
use App\Services\PromotionDependencyGuard;
use App\Support\Participations\ParticipationTeamResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class EventParticipantController extends Controller
{
    public function __construct(
        private readonly ParticipationTeamResolver $participationTeamResolver,
    ) {}

    public function store(StoreEventParticipantsRequest $request, Tournament $tournament, Event $event): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $rows = $request->validated()['participants'];
        $isTeamEvent = $event->event_type === 'team';

        DB::transaction(function () use ($tournament, $event, $rows, $isTeamEvent): void {
            foreach ($rows as $row) {
                $medalType = (string) ($row['medal_type'] ?? '');
                $position = $row['position'] ?? $row['medal_position'] ?? null;
                $remarks = $row['remarks'] ?? null;

                if (in_array($medalType, ['GOLD', 'SILVER', 'BRONZE'], true)) {
                    $positionMap = ['GOLD' => 1, 'SILVER' => 2, 'BRONZE' => 3];
                    $position = $positionMap[$medalType];
                }

                if ($isTeamEvent) {
                    $teamId = $row['team_id'] ?? null;
                    $playerIds = array_values(array_filter(array_map('intval', (array) ($row['player_ids'] ?? [])), static fn (int $id): bool => $id > 0));

                    $existingTeamParticipation = Participation::query()
                        ->where('event_id', $event->id)
                        ->where('team_id', $teamId)
                        ->with('achievement')
                        ->first();

                    $effectivePosition = $position ?? $existingTeamParticipation?->position;
                    $effectiveMedalType = ! empty($medalType)
                        ? $medalType
                        : ($existingTeamParticipation?->achievement?->medal_type ?? null);
                    $effectiveRemarks = $remarks ?? $existingTeamParticipation?->achievement?->remarks;

                    foreach ($playerIds as $pId) {
                        $participation = Participation::updateOrCreate(
                            [
                                'event_id' => $event->id,
                                'member_id' => $pId,
                            ],
                            [
                                'session_id' => $tournament->session_id,
                                'team_id' => $teamId,
                                'position' => $effectivePosition,
                                'lineup_member_ids' => null,
                            ],
                        );

                        if (! empty($effectiveMedalType)) {
                            Achievement::updateOrCreate(
                                ['participation_id' => $participation->id],
                                [
                                    'medal_type' => $effectiveMedalType,
                                    'position' => $effectivePosition,
                                    'remarks' => $effectiveRemarks,
                                ],
                            );
                        }
                    }
                } else {
                    $memberId = $row['member_id'] ?? null;
                    $teamId = $this->participationTeamResolver->resolveTeamId(
                        (int) ($memberId ?? 0),
                        (int) $tournament->session_id,
                        (int) $event->sport_id,
                    ) ?? ($row['team_id'] ?? null);

                    $participation = Participation::updateOrCreate(
                        [
                            'event_id' => $event->id,
                            'member_id' => $memberId,
                        ],
                        [
                            'session_id' => $tournament->session_id,
                            'position' => $position,
                            'team_id' => $teamId,
                            'lineup_member_ids' => null,
                        ],
                    );

                    if (! empty($medalType)) {
                        Achievement::updateOrCreate(
                            ['participation_id' => $participation->id],
                            [
                                'medal_type' => $medalType,
                                'position' => $position,
                                'remarks' => $remarks,
                            ],
                        );
                    } else {
                        $participation->achievement?->delete();
                    }
                }
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participants saved.')]);

        return to_route('tournaments.events.show', [$tournament, $event]);
    }

    public function update(UpdateParticipantRequest $request, Tournament $tournament, Event $event, Participation $participation, PromotionDependencyGuard $guard): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $validated = $request->validated();
        $medalType = (string) ($validated['medal_type'] ?? '');
        $position = $validated['position'] ?? null;
        $remarks = $validated['remarks'] ?? null;

        if (in_array($medalType, ['GOLD', 'SILVER', 'BRONZE'], true)) {
            $positionMap = ['GOLD' => 1, 'SILVER' => 2, 'BRONZE' => 3];
            $position = $positionMap[$medalType];
        }

        $participationsToUpdate = $event->event_type === 'team' && $participation->team_id !== null
            ? Participation::query()
                ->where('event_id', $event->id)
                ->where('team_id', $participation->team_id)
                ->get()
            : collect([$participation]);

        foreach ($participationsToUpdate as $p) {
            $p->update(['position' => $position]);

            if (! empty($validated['medal_type'])) {
                Achievement::updateOrCreate(
                    ['participation_id' => $p->id],
                    [
                        'medal_type' => $validated['medal_type'],
                        'position' => $position,
                        'remarks' => $remarks,
                    ],
                );
            } else {
                $achievement = $p->achievement;

                if ($achievement !== null) {
                    $dependents = $guard->forAchievement($achievement);

                    if ($dependents->isNotEmpty()) {
                        Inertia::flash('toast', [
                            'type' => 'error',
                            'message' => $this->dependencyMessage($dependents),
                        ]);

                        return back();
                    }

                    $achievement->delete();
                }
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant updated.')]);

        return back();
    }

    public function destroy(Tournament $tournament, Event $event, Participation $participation, Request $request, PromotionDependencyGuard $guard): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $memberId = (int) $request->integer('member_id');

        if ($memberId > 0 && $participation->member_id !== $memberId) {
            $target = Participation::query()
                ->where('event_id', $event->id)
                ->where('member_id', $memberId)
                ->first();

            if ($target !== null) {
                $participation = $target;
            }
        }

        $dependents = $guard->forParticipation($participation);

        if ($dependents->isNotEmpty()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => $this->dependencyMessage($dependents),
            ]);

            return back();
        }

        $participation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant removed.')]);

        return back();
    }

    /**
     * @param  Collection<int, array{type: string, name: string, id: int}>  $dependents
     */
    private function dependencyMessage(Collection $dependents): string
    {
        $names = $dependents->pluck('name')->unique()->implode(', ');

        return __('Cannot delete because it is used as evidence for promotions/rewards of: :names.', ['names' => $names]);
    }
}
