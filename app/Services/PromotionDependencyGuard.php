<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Achievement;
use App\Models\CoachPromotionEvidence;
use App\Models\Event;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Tournament;
use Illuminate\Support\Collection;

class PromotionDependencyGuard
{
    /**
     * Check whether deleting or changing the given tournament would affect
     * any recorded coach or member promotion/reward.
     *
     * @return Collection<int, array{type: string, name: string, id: int}>
     */
    public function forTournament(Tournament $tournament): Collection
    {
        $dependents = collect();

        CoachPromotionEvidence::query()
            ->with('coachPromotion.coach:id,full_name')
            ->where('tournament_id', $tournament->id)
            ->get()
            ->each(function (CoachPromotionEvidence $evidence) use ($dependents): void {
                $dependents->push([
                    'type' => 'coach_promotion',
                    'name' => $evidence->coachPromotion?->coach?->full_name ?? __('Unknown coach'),
                    'id' => $evidence->coach_promotion_id,
                ]);
            });

        $achievementIds = $this->achievementIdsForTournament($tournament);
        $participationIds = $this->participationIdsForTournament($tournament);

        $this->addMemberDependents($dependents, $achievementIds, $participationIds);

        return $dependents->unique(fn (array $item): string => $item['type'].'-'.$item['id'])->values();
    }

    /**
     * Check whether deleting or changing the given event would affect any
     * recorded promotion/reward.
     *
     * @return Collection<int, array{type: string, name: string, id: int}>
     */
    public function forEvent(Event $event): Collection
    {
        $dependents = collect();

        CoachPromotionEvidence::query()
            ->with('coachPromotion.coach:id,full_name')
            ->where(function ($query) use ($event): void {
                $query->where('event_id', $event->id)
                    ->orWhere('tournament_id', $event->tournament_id);
            })
            ->get()
            ->each(function (CoachPromotionEvidence $evidence) use ($dependents): void {
                $dependents->push([
                    'type' => 'coach_promotion',
                    'name' => $evidence->coachPromotion?->coach?->full_name ?? __('Unknown coach'),
                    'id' => $evidence->coach_promotion_id,
                ]);
            });

        $achievementIds = $this->achievementIdsForEvent($event);
        $participationIds = $this->participationIdsForEvent($event);

        $this->addMemberDependents($dependents, $achievementIds, $participationIds);

        return $dependents->unique(fn (array $item): string => $item['type'].'-'.$item['id'])->values();
    }

    /**
     * Check whether deleting or changing the given participation would affect
     * any recorded promotion/reward.
     *
     * @return Collection<int, array{type: string, name: string, id: int}>
     */
    public function forParticipation(Participation $participation): Collection
    {
        $dependents = collect();

        CoachPromotionEvidence::query()
            ->with('coachPromotion.coach:id,full_name')
            ->where('tournament_id', $participation->event?->tournament_id)
            ->where('team_id', $participation->team_id)
            ->where('session_id', $participation->session_id)
            ->get()
            ->each(function (CoachPromotionEvidence $evidence) use ($dependents): void {
                $dependents->push([
                    'type' => 'coach_promotion',
                    'name' => $evidence->coachPromotion?->coach?->full_name ?? __('Unknown coach'),
                    'id' => $evidence->coach_promotion_id,
                ]);
            });

        $achievementIds = $participation->achievement ? [$participation->achievement->id] : [];

        $this->addMemberDependents($dependents, $achievementIds, [$participation->id]);

        return $dependents->unique(fn (array $item): string => $item['type'].'-'.$item['id'])->values();
    }

    /**
     * Check whether deleting or changing the given achievement would affect
     * any recorded promotion/reward.
     *
     * @return Collection<int, array{type: string, name: string, id: int}>
     */
    public function forAchievement(Achievement $achievement): Collection
    {
        $dependents = collect();

        CoachPromotionEvidence::query()
            ->with('coachPromotion.coach:id,full_name')
            ->where(function ($query) use ($achievement): void {
                $query->where('achievement_id', $achievement->id)
                    ->orWhere(function ($query) use ($achievement): void {
                        $participation = $achievement->participation;

                        if ($participation === null) {
                            return;
                        }

                        $query
                            ->where('tournament_id', $participation->event?->tournament_id)
                            ->where('team_id', $participation->team_id)
                            ->where('session_id', $participation->session_id);
                    });
            })
            ->get()
            ->each(function (CoachPromotionEvidence $evidence) use ($dependents): void {
                $dependents->push([
                    'type' => 'coach_promotion',
                    'name' => $evidence->coachPromotion?->coach?->full_name ?? __('Unknown coach'),
                    'id' => $evidence->coach_promotion_id,
                ]);
            });

        $this->addMemberDependents($dependents, [$achievement->id], []);

        return $dependents->unique(fn (array $item): string => $item['type'].'-'.$item['id'])->values();
    }

    /**
     * @param  Collection<int, array{type: string, name: string, id: int}>  $dependents
     * @param  array<int, int>  $achievementIds
     * @param  array<int, int>  $participationIds
     */
    private function addMemberDependents(Collection $dependents, array $achievementIds, array $participationIds): void
    {
        if ($achievementIds !== []) {
            PromotionEvidence::query()
                ->with('memberPromotion.member:id,full_name')
                ->where('evidencable_type', Achievement::class)
                ->whereIn('evidencable_id', $achievementIds)
                ->get()
                ->each(function (PromotionEvidence $evidence) use ($dependents): void {
                    $dependents->push([
                        'type' => 'member_promotion',
                        'name' => $evidence->memberPromotion?->member?->full_name ?? __('Unknown member'),
                        'id' => $evidence->member_promotion_id,
                    ]);
                });
        }

        if ($participationIds !== []) {
            PromotionEvidence::query()
                ->with('memberPromotion.member:id,full_name')
                ->where('evidencable_type', Participation::class)
                ->whereIn('evidencable_id', $participationIds)
                ->get()
                ->each(function (PromotionEvidence $evidence) use ($dependents): void {
                    $dependents->push([
                        'type' => 'member_promotion',
                        'name' => $evidence->memberPromotion?->member?->full_name ?? __('Unknown member'),
                        'id' => $evidence->member_promotion_id,
                    ]);
                });
        }
    }

    /**
     * @return array<int, int>
     */
    private function achievementIdsForTournament(Tournament $tournament): array
    {
        return Achievement::query()
            ->whereHas('participation.event', fn ($query) => $query->where('tournament_id', $tournament->id))
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function participationIdsForTournament(Tournament $tournament): array
    {
        return Participation::query()
            ->whereHas('event', fn ($query) => $query->where('tournament_id', $tournament->id))
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function achievementIdsForEvent(Event $event): array
    {
        return Achievement::query()
            ->whereHas('participation', fn ($query) => $query->where('event_id', $event->id))
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function participationIdsForEvent(Event $event): array
    {
        return Participation::query()
            ->where('event_id', $event->id)
            ->pluck('id')
            ->all();
    }
}
