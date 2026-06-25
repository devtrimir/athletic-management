<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachPromotionRequest;
use App\Http\Requests\Coaches\UpdateCoachPromotionRequest;
use App\Models\Coach;
use App\Models\CoachPromotion;
use App\Models\Rank;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachPromotionController extends Controller
{
    public function store(StoreCoachPromotionRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('managePromotions', $coach);

        $data = array_merge($request->validated(), [
            'from_rank' => $request->input('from_rank') ?: $coach->rankMaster?->code,
        ]);

        CoachPromotion::create(array_merge(
            $data,
            [
                'organization_id' => $coach->organization_id,
                'coach_id' => $coach->id,
                'recorded_by' => $request->user()?->id,
            ],
        ));

        $this->syncCoachPromotionState($coach);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion or reward recorded.')]);

        return to_route('coaches.promotions', $coach);
    }

    public function update(UpdateCoachPromotionRequest $request, Coach $coach, CoachPromotion $promotion): RedirectResponse
    {
        Gate::authorize('managePromotions', $coach);

        abort_if($promotion->coach_id !== $coach->id, 404);

        $data = array_merge($request->validated(), [
            'from_rank' => $request->input('from_rank') ?: $promotion->from_rank ?: $coach->rankMaster?->code,
        ]);

        $promotion->update($data);
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

        $rankId = Rank::query()
            ->where('code', $latestPromotion->to_rank)
            ->value('id');

        if ($rankId !== null) {
            $coach->update(['rank_master_id' => $rankId]);
        }
    }
}
