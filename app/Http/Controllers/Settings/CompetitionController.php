<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\SaveCompetitionRequest;
use App\Models\Competition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CompetitionController extends Controller
{
    public function store(SaveCompetitionRequest $request): RedirectResponse
    {
        Competition::create($request->validated() + ['organization_id' => (int) $request->user()->organization_id, 'is_active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Competition created.')]);

        return to_route('game-levels.index');
    }

    /**
     * Moving a competition to another level only affects tournaments scored from now on;
     * results already scored keep the level they were scored with.
     */
    public function update(SaveCompetitionRequest $request, Competition $competition): RedirectResponse
    {
        $competition->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Competition updated.')]);

        return to_route('game-levels.index');
    }

    public function destroy(Competition $competition): RedirectResponse
    {
        Gate::authorize('delete', $competition);

        if ($competition->tournaments()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Tournaments use this competition. Deactivate it instead.')]);

            return to_route('game-levels.index');
        }

        $competition->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Competition deleted.')]);

        return to_route('game-levels.index');
    }
}
