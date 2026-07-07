<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Incharges\StoreInchargeAchievementRequest;
use App\Http\Requests\Incharges\UpdateInchargeAchievementRequest;
use App\Models\Incharge;
use App\Models\InchargeAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class InchargeAchievementController extends Controller
{
    public function store(StoreInchargeAchievementRequest $request, Incharge $incharge): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $incharge);

        $incharge->achievements()->create([
            ...$request->validated(),
            'organization_id' => $incharge->organization_id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge achievement recorded.')]);

        return to_route('incharges.achievements', $incharge);
    }

    public function update(
        UpdateInchargeAchievementRequest $request,
        Incharge $incharge,
        InchargeAchievement $achievement,
    ): RedirectResponse {
        Gate::authorize('manageSpecialAchievements', $incharge);
        abort_unless($achievement->incharge_id === $incharge->id, 404);

        $achievement->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge achievement updated.')]);

        return to_route('incharges.achievements', $incharge);
    }

    public function destroy(Incharge $incharge, InchargeAchievement $achievement): RedirectResponse
    {
        Gate::authorize('manageSpecialAchievements', $incharge);
        abort_unless($achievement->incharge_id === $incharge->id, 404);

        $achievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge achievement removed.')]);

        return to_route('incharges.achievements', $incharge);
    }
}
