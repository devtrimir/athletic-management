<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Events\StoreEventRequest;
use App\Http\Requests\Events\UpdateEventRequest;
use App\Models\Event;
use App\Models\Sport;
use App\Models\Tournament;
use App\Services\Tournaments\TournamentEventPayload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function store(StoreEventRequest $request, Tournament $tournament, TournamentEventPayload $payload): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $data = $payload->forStoreOrUpdate($tournament, $request->validated());
        $data['tournament_id'] = $tournament->id;

        $event = Event::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event created.')]);

        return to_route('tournaments.events.show', [$tournament, $event]);
    }

    public function show(Tournament $tournament, Event $event): Response
    {
        Gate::authorize('view', $tournament);

        $event->load([
            'sport:id,name',
            'sportEventVariant:id,name,code,participation_format_id,measurement_unit_id,result_type_id,is_team_based,is_medal_event,min_participants,max_participants,substitute_allowed,substitute_limit',
            'sportEventVariant.participationFormat:id,name',
            'sportEventVariant.measurementUnit:id,name,symbol',
            'sportEventVariant.resultType:id,name',
        ]);

        $orgId = $tournament->organization_id;
        $sports = Sport::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        return Inertia::render('events/show', [
            'tournament' => [
                'id' => $tournament->id,
                'name' => $tournament->name,
            ],
            'event' => [
                'id' => $event->id,
                'sport_id' => $event->sport_id,
                'sport_event_variant_id' => $event->sport_event_variant_id,
                'can_update_structure' => ! $event->participations()->exists(),
                'name' => $event->name,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'gender_class' => $event->gender_class,
                'event_source' => $event->event_source,
                'provisional_reason' => $event->provisional_reason,
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
                'variant' => $this->variantData($event->sportEventVariant),
            ],
            'sports' => $sports,
            'eventVariants' => $this->eventVariants($tournament),
            'participations' => Inertia::defer(fn () => $event->participations()
                ->with(['member:id,full_name,pno', 'achievement'])
                ->withCount('media')
                ->orderBy('position')
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'position' => $p->position,
                    'media_files_count' => $p->media_count,
                    'member' => $p->member ? [
                        'id' => $p->member->id,
                        'full_name' => $p->member->full_name,
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

    public function update(UpdateEventRequest $request, Tournament $tournament, Event $event, TournamentEventPayload $payload): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        if ($event->participations()->exists()) {
            throw ValidationException::withMessages([
                'event' => __('Event cannot be edited after participants have been added.'),
            ]);
        }

        $event->update($payload->forStoreOrUpdate($tournament, $request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event updated.')]);

        return back();
    }

    public function destroy(Tournament $tournament, Event $event): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $event->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Event deleted.')]);

        return to_route('tournaments.events', $tournament);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function eventVariants(Tournament $tournament)
    {
        return Sport::query()
            ->where('organization_id', $tournament->organization_id)
            ->with([
                'eventVariants' => fn ($query) => $query
                    ->where('is_active', true)
                    ->with([
                        'sportEvent:id,name,discipline_type',
                        'genderCategory:id,name,code',
                        'weightCategory:id,name',
                        'participationFormat:id,name',
                        'measurementUnit:id,name,symbol',
                        'resultType:id,name',
                    ])
                    ->orderBy('sort_order')
                    ->orderBy('name'),
            ])
            ->orderBy('name')
            ->get(['id', 'name'])
            ->flatMap(fn (Sport $sport) => $sport->eventVariants->map(fn ($variant): array => [
                'id' => $variant->id,
                'sport_id' => $sport->id,
                'sport_name' => $sport->name,
                'label' => $variant->name,
                'name' => $variant->sportEvent?->name ?? $variant->name,
                'discipline' => $variant->sportEvent?->discipline_type,
                'weight_category' => $variant->weightCategory?->name,
                'gender_class' => $this->genderClass($variant->genderCategory?->code),
                'gender_label' => $variant->genderCategory?->name,
                'format' => $variant->participationFormat?->name,
                'result_type' => $variant->resultType?->name,
                'measurement_unit' => $variant->measurementUnit?->name,
                'measurement_symbol' => $variant->measurementUnit?->symbol,
                'min_participants' => $variant->min_participants,
                'max_participants' => $variant->max_participants,
                'substitute_allowed' => $variant->substitute_allowed,
                'substitute_limit' => $variant->substitute_limit,
                'is_team_based' => $variant->is_team_based,
                'is_medal_event' => $variant->is_medal_event,
            ]))
            ->values();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function variantData(mixed $variant): ?array
    {
        if ($variant === null) {
            return null;
        }

        return [
            'id' => $variant->id,
            'label' => $variant->name,
            'format' => $variant->participationFormat?->name,
            'result_type' => $variant->resultType?->name,
            'measurement_unit' => $variant->measurementUnit?->name,
            'measurement_symbol' => $variant->measurementUnit?->symbol,
            'min_participants' => $variant->min_participants,
            'max_participants' => $variant->max_participants,
            'substitute_allowed' => $variant->substitute_allowed,
            'substitute_limit' => $variant->substitute_limit,
            'is_team_based' => $variant->is_team_based,
            'is_medal_event' => $variant->is_medal_event,
        ];
    }

    private function genderClass(?string $code): string
    {
        return match ($code) {
            'MEN' => 'M',
            'WOMEN' => 'F',
            'MIXED' => 'MIXED',
            default => 'OPEN',
        };
    }
}
