<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Events\StoreEventRequest;
use App\Models\Event;
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

        $event->load('sport:id,name');

        return Inertia::render('events/show', [
            'tournament' => [
                'id' => $tournament->id,
                'name_hi' => $tournament->name_hi,
            ],
            'event' => [
                'id' => $event->id,
                'name_hi' => $event->name_hi,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'gender_class' => $event->gender_class,
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ],
            'participations' => Inertia::defer(fn () => $event->participations()
                ->with(['member:id,full_name_hi,member_code,pno', 'achievement'])
                ->orderBy('position')
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'position' => $p->position,
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
}
