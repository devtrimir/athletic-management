<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachPlayingAchievementRequest;
use App\Http\Requests\Coaches\UpdateCoachPlayingAchievementRequest;
use App\Models\Coach;
use App\Models\CoachPlayingAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachPlayingAchievementController extends Controller
{
    public function store(StoreCoachPlayingAchievementRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('managePlayingAchievements', $coach);

        $coach->playingAchievements()->create([
            ...$request->validated(),
            'organization_id' => $coach->organization_id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Playing career achievement recorded.')]);

        return to_route('coaches.achievements', $coach);
    }

    public function update(
        UpdateCoachPlayingAchievementRequest $request,
        Coach $coach,
        CoachPlayingAchievement $playingAchievement,
    ): RedirectResponse {
        Gate::authorize('managePlayingAchievements', $coach);
        abort_unless($playingAchievement->coach_id === $coach->id, 404);

        $playingAchievement->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Playing career achievement updated.')]);

        return to_route('coaches.achievements', $coach);
    }

    public function destroy(Coach $coach, CoachPlayingAchievement $playingAchievement): RedirectResponse
    {
        Gate::authorize('managePlayingAchievements', $coach);
        abort_unless($playingAchievement->coach_id === $coach->id, 404);

        $playingAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Playing career achievement removed.')]);

        return to_route('coaches.achievements', $coach);
    }
}
