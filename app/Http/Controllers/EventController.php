<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Events\StoreEventRequest;
use App\Http\Requests\Events\UpdateEventRequest;
use App\Models\Event;
use App\Models\Sport;
use App\Models\Tournament;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function store(StoreEventRequest $request, Tournament $tournament): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $data = $request->validated();
        $data['tournament_id'] = $tournament->id;

        $event = Event::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event created.')]);

        return to_route('tournaments.events.show', [$tournament, $event]);
    }

    public function show(Tournament $tournament, Event $event): Response
    {
        Gate::authorize('view', $tournament);

        $event->load('sport:id,name_hi,name_en');

        $orgId = $tournament->organization_id;
        $sports = Sport::select(['id', 'name_hi', 'name_en'])
            ->where('organization_id', $orgId)
            ->orderBy('name_hi')
            ->get();

        return Inertia::render('events/show', [
            'tournament' => [
                'id' => $tournament->id,
                'name_hi' => $tournament->name_hi,
            ],
            'event' => [
                'id' => $event->id,
                'sport_id' => $event->sport_id,
                'name_hi' => $event->name_hi,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'gender_class' => $event->gender_class,
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ],
            'sports' => $sports,
            'participations' => Inertia::defer(fn () => $event->participations()
                ->with(['member:id,full_name_hi,member_code,pno', 'achievement'])
                ->withCount('media')
                ->orderBy('position')
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'position' => $p->position,
                    'media_files_count' => $p->media_count,
                    'member' => $p->member ? [
                        'id' => $p->member->id,
                        'full_name_hi' => $p->member->full_name_hi,
                        'member_code' => $p->member->member_code,
                        'pno' => $p->member->pno,
                    ] : null,
                    'achievement' => $p->achievement ? [
                        'medal_type' => $p->achievement->medal_type,
                        'position' => $p->achievement->position,
                        'remarks' => $p->achievement->remarks,
                    ] : null,
                ])),
        ]);
    }

    public function update(UpdateEventRequest $request, Tournament $tournament, Event $event): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $event->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event updated.')]);

        return back();
    }

    public function destroy(Tournament $tournament, Event $event): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $event->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event deleted.')]);

        return to_route('tournaments.show', $tournament);
    }
}
