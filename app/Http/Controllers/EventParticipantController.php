<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\EventParticipants\StoreEventParticipantsRequest;
use App\Http\Requests\EventParticipants\UpdateParticipantRequest;
use App\Models\Achievement;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Tournament;
use App\Support\Participations\ParticipationTeamResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                $memberId = $isTeamEvent ? null : ($row['member_id'] ?? null);
                $teamId = $isTeamEvent
                    ? ($row['team_id'] ?? null)
                    : $this->participationTeamResolver->resolveTeamId(
                        (int) ($memberId ?? 0),
                        (int) $tournament->session_id,
                        (int) $event->sport_id,
                    );
                $medalType = (string) ($row['medal_type'] ?? '');
                $position = $row['position'] ?? $row['medal_position'] ?? null;
                $remarks = $row['remarks'] ?? null;

                if (in_array($medalType, ['GOLD', 'SILVER', 'BRONZE'], true)) {
                    $positionMap = ['GOLD' => 1, 'SILVER' => 2, 'BRONZE' => 3];
                    $position = $positionMap[$medalType];
                }

                $newLineupMemberIds = $isTeamEvent
                    ? array_values(array_filter(array_map('intval', (array) ($row['player_ids'] ?? [])), static fn (int $id): bool => $id > 0))
                    : [];

                if ($isTeamEvent) {
                    $existingParticipation = Participation::query()
                        ->where('event_id', $event->id)
                        ->where('team_id', $teamId)
                        ->whereNull('member_id')
                        ->first();

                    $lineupMemberIds = array_values(array_unique(array_merge(
                        (array) ($existingParticipation?->lineup_member_ids ?? []),
                        $newLineupMemberIds,
                    )));

                    $participation = $existingParticipation ?? new Participation;
                    $participation->fill([
                        'event_id' => $event->id,
                        'session_id' => $tournament->session_id,
                        'team_id' => $teamId,
                        'member_id' => null,
                        'position' => $position,
                        'lineup_member_ids' => $lineupMemberIds,
                    ]);
                    $participation->save();
                } else {
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
                }

                if (! empty($row['medal_type'])) {
                    Achievement::updateOrCreate(
                        ['participation_id' => $participation->id],
                        [
                            'medal_type' => $row['medal_type'],
                            'position' => $position,
                            'remarks' => $remarks,
                        ],
                    );
                } else {
                    $participation->achievement?->delete();
                }
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participants saved.')]);

        return to_route('tournaments.events.show', [$tournament, $event]);
    }

    public function update(UpdateParticipantRequest $request, Tournament $tournament, Event $event, Participation $participation): RedirectResponse
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

        $participation->update(['position' => $position]);

        if (! empty($validated['medal_type'])) {
            Achievement::updateOrCreate(
                ['participation_id' => $participation->id],
                [
                    'medal_type' => $validated['medal_type'],
                    'position' => $position,
                    'remarks' => $remarks,
                ],
            );
        } else {
            $participation->achievement?->delete();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant updated.')]);

        return back();
    }

    public function destroy(Tournament $tournament, Event $event, Participation $participation, Request $request): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $memberId = (int) $request->integer('member_id');

        if ($event->event_type === 'team' && $memberId > 0 && ! empty($participation->lineup_member_ids)) {
            $lineupMemberIds = array_values(
                array_filter(
                    array_map('intval', (array) $participation->lineup_member_ids),
                    static fn (int $id): bool => $id > 0,
                ),
            );

            if (! in_array($memberId, $lineupMemberIds, true)) {
                Inertia::flash('toast', ['type' => 'error', 'message' => __('Selected participant is not in this team lineup.')]);

                return back();
            }

            $updated = array_values(
                array_filter(
                    $lineupMemberIds,
                    static fn (int $id): bool => $id !== $memberId,
                ),
            );

            if (count($updated) === 0) {
                $participation->delete();
                Inertia::flash('toast', ['type' => 'success', 'message' => __('Team participation removed as no players remain.')]);

                return back();
            }

            $participation->update(['lineup_member_ids' => $updated]);
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant removed from team lineup.')]);

            return back();
        }

        $participation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant removed.')]);

        return back();
    }
}
