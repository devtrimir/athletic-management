<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\EventParticipants\StoreEventParticipantsRequest;
use App\Http\Requests\EventParticipants\UpdateParticipantRequest;
use App\Models\Achievement;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Tournament;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class EventParticipantController extends Controller
{
    public function store(StoreEventParticipantsRequest $request, Tournament $tournament, Event $event): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $rows = $request->validated()['participants'];

        DB::transaction(function () use ($tournament, $event, $rows): void {
            foreach ($rows as $row) {
                $participation = Participation::updateOrCreate(
                    [
                        'event_id' => $event->id,
                        'member_id' => $row['member_id'],
                    ],
                    [
                        'session_id' => $tournament->session_id,
                        'position' => $row['position'] ?? null,
                        'team_id' => $row['team_id'] ?? null,
                    ],
                );

                if (! empty($row['medal_type'])) {
                    Achievement::updateOrCreate(
                        ['participation_id' => $participation->id],
                        [
                            'medal_type' => $row['medal_type'],
                            'position' => $row['medal_position'] ?? null,
                            'remarks' => $row['remarks'] ?? null,
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

        $participation->update(['position' => $validated['position'] ?? null]);

        if (! empty($validated['medal_type'])) {
            Achievement::updateOrCreate(
                ['participation_id' => $participation->id],
                [
                    'medal_type' => $validated['medal_type'],
                    'position' => $validated['medal_position'] ?? null,
                    'remarks' => $validated['remarks'] ?? null,
                ],
            );
        } else {
            $participation->achievement?->delete();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant updated.')]);

        return back();
    }

    public function destroy(Tournament $tournament, Event $event, Participation $participation): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $participation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Participant removed.')]);

        return back();
    }
}
