<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachPromotionRequest;
use App\Http\Requests\Coaches\UpdateCoachPromotionRequest;
use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\Member;
use App\Models\Rank;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachPromotionController extends Controller
{
    public function store(StoreCoachPromotionRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('managePromotions', $coach);

        $validated = $request->validated();
        $evidences = $validated['evidences'] ?? [];
        unset($validated['evidences']);

        $data = array_merge($validated, [
            'from_rank' => $request->input('from_rank') ?: $coach->rankMaster?->code,
        ]);

        $promotion = CoachPromotion::create(array_merge(
            $data,
            [
                'organization_id' => $coach->organization_id,
                'coach_id' => $coach->id,
                'recorded_by' => $request->user()?->id,
            ],
        ));

        $this->syncEvidences($promotion, $coach, $evidences);
        $this->syncCoachPromotionState($coach);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion or reward recorded.')]);

        return to_route('coaches.promotions', $coach);
    }

    public function update(UpdateCoachPromotionRequest $request, Coach $coach, CoachPromotion $promotion): RedirectResponse
    {
        Gate::authorize('managePromotions', $coach);

        abort_if($promotion->coach_id !== $coach->id, 404);

        $validated = $request->validated();
        $shouldSyncEvidences = array_key_exists('evidences', $validated);
        $evidences = $validated['evidences'] ?? [];
        unset($validated['evidences']);

        $data = array_merge($validated, [
            'from_rank' => $request->input('from_rank') ?: $promotion->from_rank ?: $coach->rankMaster?->code,
        ]);

        $promotion->update($data);

        if ($shouldSyncEvidences) {
            $promotion->evidences()->delete();
            $this->syncEvidences($promotion, $coach, $evidences);
        }

        $this->syncCoachPromotionState($coach);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion or reward updated.')]);

        return to_route('coaches.promotions', $coach);
    }

    public function destroy(Coach $coach, CoachPromotion $promotion): RedirectResponse
    {
        Gate::authorize('managePromotions', $coach);

        abort_if($promotion->coach_id !== $coach->id, 404);

        $promotion->delete();
        $this->syncCoachPromotionState($coach);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion or reward removed.')]);

        return to_route('coaches.promotions', $coach);
    }

    private function syncCoachPromotionState(Coach $coach): void
    {
        $latestPromotion = CoachPromotion::query()
            ->where('coach_id', $coach->id)
            ->whereNotNull('to_rank')
            ->orderByRaw('promotion_date IS NULL')
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->first();

        if ($latestPromotion?->to_rank === null) {
            return;
        }

        $rank = Rank::query()
            ->where('code', $latestPromotion->to_rank)
            ->orWhere('name', $latestPromotion->to_rank)
            ->first();

        if ($rank !== null) {
            $coach->update(['rank_master_id' => $rank->id]);

            Member::query()
                ->where('id', $coach->member_id)
                ->orWhere('coach_id', $coach->id)
                ->update(['rank' => $rank->code]);
        }
    }

    /**
     * @param  array<int, array{session_id: int, tournament_id: int, event_id?: int|null, team_id?: int|null, achievement_id?: int|null}>  $evidences
     */
    private function syncEvidences(CoachPromotion $promotion, Coach $coach, array $evidences): void
    {
        if ($evidences === []) {
            return;
        }

        $availableKeys = $this->availableRewardEvidenceKeys($coach, $promotion);

        foreach (collect($evidences)->unique(fn (array $evidence): string => $this->rewardEvidenceKey($evidence))->values() as $evidence) {
            $key = $this->rewardEvidenceKey($evidence);

            abort_if(! isset($availableKeys[$key]) || $this->tournamentEvidenceAlreadyUsed($coach, $promotion, $evidence), 422, 'Invalid or already rewarded coach reward evidence.');

            CoachPromotionEvidence::create([
                'organization_id' => $coach->organization_id,
                'coach_promotion_id' => $promotion->id,
                'session_id' => $evidence['session_id'],
                'tournament_id' => $evidence['tournament_id'],
                'event_id' => $evidence['event_id'] ?? null,
                'team_id' => $evidence['team_id'] ?? null,
                'achievement_id' => $evidence['achievement_id'] ?? null,
            ]);
        }
    }

    /** @param  array<string, mixed>  $evidence */
    private function tournamentEvidenceAlreadyUsed(Coach $coach, CoachPromotion $currentPromotion, array $evidence): bool
    {
        $isReward = $currentPromotion->cash_reward_amount !== null;

        return CoachPromotionEvidence::query()
            ->whereHas('coachPromotion', fn ($query) => $query
                ->where('coach_id', $coach->id)
                ->whereKeyNot($currentPromotion->id)
                ->when(
                    $isReward,
                    fn ($q) => $q->whereNotNull('cash_reward_amount'),
                    fn ($q) => $q->whereNotNull('to_rank'),
                ))
            ->where('session_id', $evidence['session_id'])
            ->where('tournament_id', $evidence['tournament_id'])
            ->when(
                isset($evidence['event_id']) && $evidence['event_id'] !== null,
                fn ($q) => $q->where(fn ($sub) => $sub->where('event_id', $evidence['event_id'])->orWhereNull('event_id')),
                fn ($q) => $q->where('team_id', $evidence['team_id'] ?? null),
            )
            ->when(
                isset($evidence['team_id']) && $evidence['team_id'] !== null,
                fn ($q) => $q->where('team_id', $evidence['team_id']),
            )
            ->exists();
    }

    /** @return array<string, true> */
    private function availableRewardEvidenceKeys(Coach $coach, CoachPromotion $currentPromotion): array
    {
        $assignments = CoachAssignment::query()
            ->where('coach_id', $coach->id)
            ->whereHas('team', fn ($query) => $query->where('organization_id', $coach->organization_id))
            ->get(['team_id', 'session_id']);

        if ($assignments->isEmpty()) {
            return [];
        }

        $assignmentPairs = $assignments
            ->map(fn (CoachAssignment $assignment): string => $assignment->team_id.':'.$assignment->session_id)
            ->unique()
            ->values();

        $isReward = $currentPromotion->cash_reward_amount !== null;

        $usedEvidenceKeys = [];
        CoachPromotionEvidence::query()
            ->whereHas('coachPromotion', fn ($query) => $query
                ->where('coach_id', $coach->id)
                ->whereKeyNot($currentPromotion->id)
                ->when(
                    $isReward,
                    fn ($q) => $q->whereNotNull('cash_reward_amount'),
                    fn ($q) => $q->whereNotNull('to_rank'),
                ))
            ->get(['session_id', 'tournament_id', 'event_id', 'team_id'])
            ->each(function (CoachPromotionEvidence $evidence) use (&$usedEvidenceKeys): void {
                $usedEvidenceKeys[$this->rewardEvidenceKey([
                    'session_id' => $evidence->session_id,
                    'tournament_id' => $evidence->tournament_id,
                    'event_id' => $evidence->event_id,
                    'team_id' => $evidence->team_id,
                ])] = true;

                if ($evidence->event_id === null) {
                    $usedEvidenceKeys[$this->rewardEvidenceKey([
                        'session_id' => $evidence->session_id,
                        'tournament_id' => $evidence->tournament_id,
                        'team_id' => $evidence->team_id,
                    ])] = true;
                }
            });

        $achievements = Achievement::query()
            ->whereHas('participation', function ($query) use ($assignmentPairs, $coach): void {
                $query
                    ->whereHas('team', fn ($teamQuery) => $teamQuery->where('organization_id', $coach->organization_id))
                    ->where(function ($pairQuery) use ($assignmentPairs): void {
                        foreach ($assignmentPairs as $pair) {
                            [$teamId, $sessionId] = explode(':', $pair);

                            $pairQuery->orWhere(function ($query) use ($teamId, $sessionId): void {
                                $query
                                    ->where('team_id', (int) $teamId)
                                    ->where('session_id', (int) $sessionId);
                            });
                        }
                    });
            })
            ->with(['participation:id,session_id,team_id,event_id', 'participation.event:id,tournament_id'])
            ->get(['id', 'participation_id']);

        $available = [];

        foreach ($achievements as $achievement) {
            $eventKey = $this->rewardEvidenceKey([
                'session_id' => $achievement->participation->session_id,
                'tournament_id' => $achievement->participation->event->tournament_id,
                'event_id' => $achievement->participation->event_id,
                'team_id' => $achievement->participation->team_id,
            ]);

            $tournamentKey = $this->rewardEvidenceKey([
                'session_id' => $achievement->participation->session_id,
                'tournament_id' => $achievement->participation->event->tournament_id,
                'team_id' => $achievement->participation->team_id,
            ]);

            if (! isset($usedEvidenceKeys[$eventKey])) {
                $available[$eventKey] = true;
            }

            if (! isset($usedEvidenceKeys[$tournamentKey])) {
                $available[$tournamentKey] = true;
            }
        }

        return $available;
    }

    /** @param  array<string, mixed>  $evidence */
    private function rewardEvidenceKey(array $evidence): string
    {
        if (isset($evidence['event_id']) && $evidence['event_id'] !== null) {
            return $evidence['session_id'].':'.$evidence['tournament_id'].':'.$evidence['event_id'].':'.($evidence['team_id'] ?? 0);
        }

        return $evidence['session_id'].':'.$evidence['tournament_id'].':'.($evidence['team_id'] ?? 0);
    }
}
