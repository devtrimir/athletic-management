<?php

declare(strict_types=1);

namespace App\Support\Tournaments;

use App\Http\Resources\TournamentResource;
use App\Models\Achievement;
use App\Models\Member;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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
            'eventSummary' => $this->eventSummary($tournament),
            'sports' => Sport::select(['id', 'name'])
                ->where('organization_id', $tournament->organization_id)
                ->orderBy('name')
                ->get(),
            'eventVariants' => $this->eventVariants($tournament),
        ];
    }

    /** @return array<string, mixed> */
    private function eventSummary(Tournament $tournament): array
    {
        $events = $tournament->events()
            ->with('sport:id,name')
            ->get(['id', 'sport_id', 'event_type']);

        if ($events->isEmpty()) {
            return [
                'sports' => [],
                'team_events' => 0,
                'individual_events' => 0,
                'team_medals' => 0,
                'individual_medals' => 0,
                'medal_counts' => [
                    'GOLD' => 0,
                    'SILVER' => 0,
                    'BRONZE' => 0,
                    'MERIT' => 0,
                ],
                'total_events' => 0,
            ];
        }

        $eventIds = $events->pluck('id');

        $teamParticipantCounts = Participation::query()
            ->select(
                'event_id',
                DB::raw(
                    'COALESCE(SUM(CASE WHEN team_id IS NOT NULL THEN COALESCE(JSON_LENGTH(lineup_member_ids), CASE WHEN member_id IS NOT NULL THEN 1 ELSE 0 END) ELSE 1 END), 0) as total',
                ),
            )
            ->whereIn('event_id', $eventIds)
            ->groupBy('event_id')
            ->pluck('total', 'event_id');

        $individualParticipantCounts = Participation::query()
            ->select('event_id', DB::raw('count(*) as total'))
            ->whereIn('event_id', $eventIds)
            ->groupBy('event_id')
            ->pluck('total', 'event_id');

        $latestAchievementIds = Achievement::query()
            ->whereIn(
                'participation_id',
                Participation::query()->select('id')->whereIn('event_id', $eventIds),
            )
            ->selectRaw('MAX(id) as id')
            ->groupBy('participation_id')
            ->pluck('id');

        $medalRows = Achievement::query()
            ->whereIn('achievements.id', $latestAchievementIds)
            ->selectRaw('events.event_type')
            ->selectRaw('events.id as event_id')
            ->selectRaw('achievements.medal_type')
            ->selectRaw('achievements.participation_id')
            ->selectRaw('participations.team_id')
            ->join('participations', 'participations.id', '=', 'achievements.participation_id')
            ->join('events', 'events.id', '=', 'participations.event_id')
            ->whereIn('events.id', $eventIds)
            ->orderByDesc('achievements.id')
            ->get();

        $seenMedals = [];

        $medalCounts = [
            'GOLD' => 0,
            'SILVER' => 0,
            'BRONZE' => 0,
            'MERIT' => 0,
        ];

        $teamMedals = 0;
        $individualMedals = 0;

        foreach ($medalRows as $row) {
            $medalType = (string) $row->medal_type;
            $eventType = (string) $row->event_type;
            $eventId = (int) $row->event_id;
            $participationId = (int) $row->participation_id;
            $teamKey = (int) ($row->team_id ?? 0);
            $dedupeKey = $eventType === 'team'
                ? $eventType . ':' . $eventId . ':' . ($teamKey > 0 ? (string) $teamKey : 'p' . $participationId)
                : 'individual:' . $participationId . ':' . $medalType;

            if (isset($seenMedals[$dedupeKey])) {
                continue;
            }

            $seenMedals[$dedupeKey] = true;

            $type = (string) $row->medal_type;
            $count = 1;

            if (array_key_exists($type, $medalCounts)) {
                $medalCounts[$type] += $count;
            }

            if ($row->event_type === 'team') {
                $teamMedals += $count;

                continue;
            }

            $individualMedals += $count;
        }

        $sportsSummary = [];
        foreach ($events as $event) {
            $eventId = $event->id;
            $sportId = (int) $event->sport_id;
            $sportName = $event->sport?->name ?? 'Unknown sport';

            if (! isset($sportsSummary[$sportId])) {
                $sportsSummary[$sportId] = [
                    'id' => $sportId,
                    'name' => $sportName,
                    'events_count' => 0,
                    'participants_count' => 0,
                ];
            }

            $sportsSummary[$sportId]['events_count'] += 1;
            $sportsSummary[$sportId]['participants_count'] +=
                $event->event_type === 'team'
                    ? (int) ($teamParticipantCounts->get($eventId, 0))
                    : (int) ($individualParticipantCounts->get($eventId, 0));
        }

        return [
            'sports' => array_values($sportsSummary),
            'team_events' => $events->where('event_type', 'team')->count(),
            'individual_events' => $events->where('event_type', 'individual')->count(),
            'team_medals' => $teamMedals,
            'individual_medals' => $individualMedals,
            'medal_counts' => $medalCounts,
            'total_events' => $events->count(),
        ];
    }

    private function appendAggregateCounts(Tournament $tournament): void
    {
        $eventIds = $tournament->events()->pluck('id');

        $events = $tournament
            ->events()
            ->select('id', 'event_type')
            ->get()
            ->keyBy('id');
        $teamParticipantCount = Participation::query()
            ->select(
                'event_id',
                DB::raw(
                    'COALESCE(SUM(CASE WHEN team_id IS NOT NULL THEN COALESCE(JSON_LENGTH(lineup_member_ids), CASE WHEN member_id IS NOT NULL THEN 1 ELSE 0 END) ELSE 1 END), 0) as total',
                ),
            )
            ->whereIn('event_id', $eventIds)
            ->groupBy('event_id')
            ->pluck('total', 'event_id');

        $participationCounts = Participation::query()
            ->select('event_id', DB::raw('count(*) as total'))
            ->whereIn('event_id', $eventIds)
            ->groupBy('event_id')
            ->pluck('total', 'event_id');

        $participantsCount = $events->reduce(
            fn (int $total, $event): int => $total + (
                $event->event_type === 'team'
                    ? (int) ($teamParticipantCount->get($event->id, 0))
                    : (int) ($participationCounts->get($event->id, 0))
            ),
            0,
        );

        $tournament->setAttribute('participants_count', $participantsCount);
        $tournament->setAttribute('teams_count', Participation::whereIn('event_id', $eventIds)->whereNotNull('team_id')->distinct('team_id')->count('team_id'));
        $tournament->setAttribute(
            'medals_count',
            Achievement::query()
                ->whereIn('participation_id', Participation::whereIn('event_id', $eventIds)->select('id'))
                ->distinct('participation_id')
                ->count('participation_id'),
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
        $eventsQuery = $tournament->events()
            ->when($filters['q'], function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('discipline', 'like', "%{$search}%")
                        ->orWhere('weight_category', 'like', "%{$search}%");
                });
            })
            ->when($filters['sport_id'], fn (Builder $query, string $sportId): Builder => $query->where('sport_id', (int) $sportId))
            ->when($filters['gender_class'], fn (Builder $query, string $genderClass): Builder => $query->where('gender_class', $genderClass))
            ->when($filters['event_type'], fn (Builder $query, string $eventType): Builder => $query->where('event_type', $eventType))
            ->when(
                $filters['participation_status'] === 'with',
                fn (Builder $query): Builder => $query->has('participations'),
            )
            ->when(
                $filters['participation_status'] === 'without',
                fn (Builder $query): Builder => $query->doesntHave('participations'),
            )
            ;

        $events = $eventsQuery
            ->orderBy('name')
            ->get(['id', 'event_type']);

        $eventIds = $events->pluck('id');
        $participantPreviews = $this->eventParticipantPreviews($eventIds);
        $lineupCountsByEvent = Participation::query()
            ->select(
                'event_id',
                DB::raw(
                    'COALESCE(SUM(CASE WHEN team_id IS NOT NULL THEN COALESCE(JSON_LENGTH(lineup_member_ids), CASE WHEN member_id IS NOT NULL THEN 1 ELSE 0 END) ELSE 1 END), 0) as total',
                ),
            )
            ->whereIn('event_id', $eventIds)
            ->groupBy('event_id')
            ->pluck('total', 'event_id');
        $singleParticipantsByEvent = $this->singleParticipantsByEvent(
            $eventIds,
            $lineupCountsByEvent,
        );

        $medalsCountByEvent = Achievement::query()
            ->select('participations.event_id', DB::raw('COUNT(DISTINCT achievements.participation_id) as total'))
            ->join('participations', 'participations.id', '=', 'achievements.participation_id')
            ->whereIn('participations.event_id', $eventIds)
            ->groupBy('participations.event_id')
            ->pluck('total', 'participations.event_id');

        $teamMedalsCountByEvent = Achievement::query()
            ->select(
                'participations.event_id',
                DB::raw('COUNT(DISTINCT CASE WHEN participations.team_id IS NOT NULL THEN participations.team_id ELSE participations.id END) as total'),
            )
            ->join('participations', 'participations.id', '=', 'achievements.participation_id')
            ->join('events', 'events.id', '=', 'participations.event_id')
            ->whereIn('participations.event_id', $eventIds)
            ->where('events.event_type', 'team')
            ->groupBy('participations.event_id')
            ->pluck('total', 'participations.event_id');

        $medalsByTypeByEvent = [];
        $medalDedup = [];
        $latestAchievementIds = Achievement::query()
            ->whereIn(
                'participation_id',
                Participation::query()->select('id')->whereIn('event_id', $eventIds),
            )
            ->selectRaw('MAX(id) as id')
            ->groupBy('participation_id')
            ->pluck('id');

        if (! $eventIds->isEmpty()) {
            $medalRows = Achievement::query()
                ->whereIn('achievements.id', $latestAchievementIds)
                ->selectRaw('events.event_type')
                ->selectRaw('events.id as event_id')
                ->selectRaw('achievements.medal_type')
                ->selectRaw('achievements.participation_id')
                ->selectRaw('participations.team_id')
                ->join('participations', 'participations.id', '=', 'achievements.participation_id')
                ->join('events', 'events.id', '=', 'participations.event_id')
                ->whereIn('participations.event_id', $eventIds)
                ->orderByDesc('achievements.id')
                ->get();

            foreach ($medalRows as $row) {
                $eventType = (string) $row->event_type;
                $eventId = (int) $row->event_id;
                $participationId = (int) $row->participation_id;
                $teamId = (int) ($row->team_id ?? 0);
                $medalType = strtoupper((string) $row->medal_type);

                if (! in_array($medalType, ['GOLD', 'SILVER', 'BRONZE', 'MERIT'], true)) {
                    continue;
                }

                $ownerKey = $eventType === 'team'
                    ? ($teamId > 0 ? "team:{$teamId}" : "participation:{$participationId}")
                    : "participation:{$participationId}";
                $dedupeKey = "{$eventType}:{$eventId}:{$ownerKey}:{$medalType}";

                if (isset($medalDedup[$dedupeKey])) {
                    continue;
                }

                $medalDedup[$dedupeKey] = true;

                if (! isset($medalsByTypeByEvent[$eventId])) {
                    $medalsByTypeByEvent[$eventId] = [
                        'gold' => 0,
                        'silver' => 0,
                        'bronze' => 0,
                        'merit' => 0,
                    ];
                }

                match ($medalType) {
                    'GOLD' => $medalsByTypeByEvent[$eventId]['gold'] += 1,
                    'SILVER' => $medalsByTypeByEvent[$eventId]['silver'] += 1,
                    'BRONZE' => $medalsByTypeByEvent[$eventId]['bronze'] += 1,
                    'MERIT' => $medalsByTypeByEvent[$eventId]['merit'] += 1,
                    default => null,
                };
            }
        }

        return $eventsQuery
            ->with('sport:id,name')
            ->withCount('participations')
            ->addSelect([
                'teams_count' => Participation::query()
                    ->selectRaw('count(distinct participations.team_id)')
                    ->whereColumn('participations.event_id', 'events.id')
                    ->whereNotNull('participations.team_id'),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn ($event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'gender_class' => $event->gender_class,
                'sport_event_variant_id' => $event->sport_event_variant_id,
                'event_type' => $event->event_type,
                'participants_required' => $event->participants_required,
                'event_source' => $event->event_source,
                'provisional_reason' => $event->provisional_reason,
                'participations_count' =>
                    $event->event_type === 'team'
                        ? (int) ($lineupCountsByEvent->get($event->id, 0))
                        : (int) $event->participations_count,
                'can_update_structure' => (int) $event->participations_count === 0,
                'teams_count' => (int) $event->teams_count,
                'medals_count' => (int) (
                    $event->event_type === 'team'
                        ? ($teamMedalsCountByEvent->get($event->id, 0))
                        : ($medalsCountByEvent->get($event->id, 0))
                ),
                'medals_by_type' => $medalsByTypeByEvent[$event->id] ?? [
                    'gold' => 0,
                    'silver' => 0,
                    'bronze' => 0,
                    'merit' => 0,
                ],
                'single_participant' => $singleParticipantsByEvent[$event->id] ?? null,
                'participant_previews' => $participantPreviews[$event->id] ?? [
                    'players' => [],
                    'more_players' => [],
                    'total_players' => 0,
                ],
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function singleParticipantsByEvent(Collection $eventIds, Collection $lineupCountsByEvent): array
    {
        if ($eventIds->isEmpty()) {
            return [];
        }

        $singleMemberByEvent = Participation::query()
            ->select('event_id', DB::raw('MIN(member_id) as member_id'))
            ->whereIn('event_id', $eventIds)
            ->whereNull('team_id')
            ->groupBy('event_id')
            ->havingRaw('COUNT(*) = 1')
            ->pluck('member_id', 'event_id')
            ->filter(fn (mixed $memberId): bool => (int) $memberId > 0);

        $teamSingleByEvent = [];
        $teamRows = Participation::query()
            ->select(['event_id', 'member_id', 'lineup_member_ids'])
            ->whereIn('event_id', $eventIds)
            ->whereNotNull('team_id')
            ->get();

        foreach ($teamRows as $teamRow) {
            $eventId = (int) $teamRow->event_id;
            if ((int) ($lineupCountsByEvent->get($eventId, 0)) !== 1) {
                continue;
            }

            $memberIds = array_values(
                array_unique(
                    array_filter(
                        array_map('intval', (array) $teamRow->lineup_member_ids),
                        static fn (int $memberId): bool => $memberId > 0,
                    ),
                ),
            );

            if (count($memberIds) === 0 && (int) $teamRow->member_id > 0) {
                $memberIds[] = (int) $teamRow->member_id;
            }

            if (count($memberIds) !== 1) {
                continue;
            }

            $teamSingleByEvent[$eventId] = $memberIds[0];
        }

        $singleMemberIds = $singleMemberByEvent
            ->values()
            ->merge($teamSingleByEvent)
            ->filter()
            ->unique()
            ->values();

        if ($singleMemberIds->isEmpty()) {
            return [];
        }

        $membersById = Member::query()
            ->select(['id', 'full_name', 'pno'])
            ->whereIn('id', $singleMemberIds)
            ->get()
            ->keyBy('id');

        $result = [];
        foreach ($singleMemberByEvent as $eventId => $memberId) {
            $member = $membersById->get((int) $memberId);
            if ($member === null) {
                continue;
            }

            $result[(int) $eventId] = [
                'id' => (int) $member->id,
                'full_name' => $member->full_name,
                'pno' => $member->pno,
            ];
        }

        foreach ($teamSingleByEvent as $eventId => $memberId) {
            if (isset($result[$eventId])) {
                continue;
            }

            $member = $membersById->get((int) $memberId);
            if ($member === null) {
                continue;
            }

            $result[$eventId] = [
                'id' => (int) $member->id,
                'full_name' => $member->full_name,
                'pno' => $member->pno,
            ];
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function eventParticipantPreviews(Collection $eventIds): array
    {
        if ($eventIds->isEmpty()) {
            return [];
        }

        $rows = Participation::query()
            ->select(['event_id', 'member_id', 'team_id', 'lineup_member_ids'])
            ->whereIn('event_id', $eventIds)
            ->get();

        $memberIdsByEvent = [];
        foreach ($rows as $row) {
            $eventId = (int) $row->event_id;
            $candidateIds = [];

            if ((int) $row->team_id > 0) {
                $candidateIds = array_values(array_filter(
                    array_map('intval', (array) ($row->lineup_member_ids ?? [])),
                    static fn (int $memberId): bool => $memberId > 0,
                ));

                if (count($candidateIds) === 0 && (int) $row->member_id > 0) {
                    $candidateIds[] = (int) $row->member_id;
                }
            } elseif ((int) $row->member_id > 0) {
                $candidateIds[] = (int) $row->member_id;
            }

            if (count($candidateIds) === 0) {
                continue;
            }

            if (! isset($memberIdsByEvent[$eventId])) {
                $memberIdsByEvent[$eventId] = [];
            }

            foreach (array_unique($candidateIds) as $memberId) {
                $memberIdsByEvent[$eventId][$memberId] = true;
            }
        }

        $allMemberIds = collect($memberIdsByEvent)
            ->flatMap(fn (array $memberIdsMap): array => array_keys($memberIdsMap))
            ->map(static fn (string|int $memberId): int => (int) $memberId)
            ->values()
            ->unique()
            ->all();

        $membersById = Member::query()
            ->select(['id', 'full_name', 'pno'])
            ->whereIn('id', $allMemberIds)
            ->get()
            ->keyBy('id');

        $result = [];
        foreach ($memberIdsByEvent as $eventId => $memberIdsMap) {
            $players = [];
            foreach (array_keys($memberIdsMap) as $memberId) {
                $member = $membersById->get((int) $memberId);
                if ($member === null) {
                    continue;
                }

                $players[] = [
                    'id' => (int) $member->id,
                    'full_name' => $member->full_name,
                    'pno' => $member->pno,
                ];
            }

            usort($players, static fn (array $a, array $b): int => strcmp(
                (string) $a['full_name'],
                (string) $b['full_name'],
            ));

            $result[(int) $eventId] = [
                'players' => array_slice($players, 0, 1),
                'more_players' => array_slice($players, 1),
                'total_players' => count($players),
            ];
        }

        return $result;
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
     * @return array{q: string|null, sport_id: string|null, gender_class: string|null, participation_status: string|null, event_type: string|null}
     */
    private function eventFilters(array $filters): array
    {
        $q = trim((string) Arr::get($filters, 'q', ''));
        $sportId = Arr::get($filters, 'sport_id');
        $genderClass = Arr::get($filters, 'gender_class');
        $participationStatus = Arr::get($filters, 'participation_status');
        $eventType = Arr::get($filters, 'event_type');

        return [
            'q' => $q !== '' ? $q : null,
            'sport_id' => is_numeric($sportId) ? (string) $sportId : null,
            'gender_class' => in_array($genderClass, ['M', 'F', 'MIXED', 'OPEN'], true) ? (string) $genderClass : null,
            'participation_status' => in_array($participationStatus, ['with', 'without'], true) ? (string) $participationStatus : null,
            'event_type' => in_array($eventType, ['individual', 'team'], true) ? (string) $eventType : null,
        ];
    }
}
