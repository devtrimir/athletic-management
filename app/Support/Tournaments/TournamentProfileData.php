<?php

declare(strict_types=1);

namespace App\Support\Tournaments;

use App\Http\Resources\TournamentResource;
use App\Models\Achievement;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class TournamentProfileData
{
    /** @return array<string, mixed> */
    public function overview(Tournament $tournament): array
    {
        return [
            ...$this->shell($tournament),
            'activeTab' => 'overview',
        ];
    }

    /** @return array<string, mixed> */
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function events(Tournament $tournament, array $filters = []): array
    {
        $filters = $this->eventFilters($filters);

        return [
            ...$this->shell($tournament),
            'activeTab' => 'events',
            'eventFilters' => $filters,
            'events' => $this->eventsPayload($tournament, $filters),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Tournament $tournament): array
    {
        $tournament->loadMissing([
            'session:id,name',
            'tier:id,code,label_hi,label_en',
            'sport:id,name',
        ]);
        $tournament->loadCount('events');
        $this->appendAggregateCounts($tournament);

        return [
            'tournament' => (new TournamentResource($tournament))->resolve(),
            'sports' => Sport::select(['id', 'name'])
                ->where('organization_id', $tournament->organization_id)
                ->orderBy('name')
                ->get(),
            'eventVariants' => $this->eventVariants($tournament),
        ];
    }

    private function appendAggregateCounts(Tournament $tournament): void
    {
        $eventIds = $tournament->events()->pluck('id');

        $tournament->setAttribute('participants_count', Participation::whereIn('event_id', $eventIds)->count());
        $tournament->setAttribute('teams_count', Participation::whereIn('event_id', $eventIds)->whereNotNull('team_id')->distinct('team_id')->count('team_id'));
        $tournament->setAttribute(
            'medals_count',
            Achievement::query()
                ->whereIn('participation_id', Participation::whereIn('event_id', $eventIds)->select('id'))
                ->count(),
        );
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    /**
     * @param  array{q: string|null, sport_id: string|null, gender_class: string|null, participation_status: string|null}  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function eventsPayload(Tournament $tournament, array $filters)
    {
        return $tournament->events()
            ->with('sport:id,name')
            ->withCount('participations')
            ->addSelect([
                'teams_count' => Participation::query()
                    ->selectRaw('count(distinct participations.team_id)')
                    ->whereColumn('participations.event_id', 'events.id')
                    ->whereNotNull('participations.team_id'),
                'medals_count' => Achievement::query()
                    ->selectRaw('count(*)')
                    ->join('participations', 'participations.id', '=', 'achievements.participation_id')
                    ->whereColumn('participations.event_id', 'events.id'),
            ])
            ->when($filters['q'], function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('discipline', 'like', "%{$search}%")
                        ->orWhere('weight_category', 'like', "%{$search}%");
                });
            })
            ->when($filters['sport_id'], fn (Builder $query, string $sportId): Builder => $query->where('sport_id', (int) $sportId))
            ->when($filters['gender_class'], fn (Builder $query, string $genderClass): Builder => $query->where('gender_class', $genderClass))
            ->when(
                $filters['participation_status'] === 'with',
                fn (Builder $query): Builder => $query->has('participations'),
            )
            ->when(
                $filters['participation_status'] === 'without',
                fn (Builder $query): Builder => $query->doesntHave('participations'),
            )
            ->orderBy('name')
            ->get()
            ->map(fn ($event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'gender_class' => $event->gender_class,
                'sport_event_variant_id' => $event->sport_event_variant_id,
                'event_source' => $event->event_source,
                'provisional_reason' => $event->provisional_reason,
                'participations_count' => $event->participations_count,
                'can_update_structure' => (int) $event->participations_count === 0,
                'teams_count' => (int) $event->teams_count,
                'medals_count' => (int) $event->medals_count,
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ]);
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

    private function genderClass(?string $code): string
    {
        return match ($code) {
            'MEN' => 'M',
            'WOMEN' => 'F',
            'MIXED' => 'MIXED',
            default => 'OPEN',
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{q: string|null, sport_id: string|null, gender_class: string|null, participation_status: string|null}
     */
    private function eventFilters(array $filters): array
    {
        $q = trim((string) Arr::get($filters, 'q', ''));
        $sportId = Arr::get($filters, 'sport_id');
        $genderClass = Arr::get($filters, 'gender_class');
        $participationStatus = Arr::get($filters, 'participation_status');

        return [
            'q' => $q !== '' ? $q : null,
            'sport_id' => is_numeric($sportId) ? (string) $sportId : null,
            'gender_class' => in_array($genderClass, ['M', 'F', 'MIXED', 'OPEN'], true) ? (string) $genderClass : null,
            'participation_status' => in_array($participationStatus, ['with', 'without'], true) ? (string) $participationStatus : null,
        ];
    }
}
