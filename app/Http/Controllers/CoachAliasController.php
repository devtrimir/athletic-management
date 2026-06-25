<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachAliasRequest;
use App\Models\Coach;
use App\Models\CoachAlias;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachAliasController extends Controller
{
    public function store(StoreCoachAliasRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('manageAlias', $coach);

        $data = $request->validated();

        CoachAlias::create([
            'coach_id' => $coach->id,
            'alias' => $data['alias'],
            'source' => $data['source'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Alias added.')]);

        return to_route('coaches.aliases', $coach);
    }

    public function destroy(Coach $coach, CoachAlias $alias): RedirectResponse
    {
        Gate::authorize('manageAlias', $coach);

        abort_if($alias->coach_id !== $coach->id, 404);

        $alias->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Alias removed.')]);

        return to_route('coaches.aliases', $coach);
    }
}
