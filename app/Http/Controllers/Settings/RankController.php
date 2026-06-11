<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreRankRequest;
use App\Http\Requests\Settings\UpdateRankRequest;
use App\Models\Rank;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RankController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Rank::class);

        $ranks = Rank::orderBy('rank_order')->get();

        return Inertia::render('settings/ranks/index', [
            'ranks' => $ranks,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Rank::class);

        return Inertia::render('settings/ranks/create');
    }

    public function store(StoreRankRequest $request): RedirectResponse
    {
        Gate::authorize('create', Rank::class);

        Rank::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Rank created.')]);

        return to_route('ranks.index');
    }

    public function edit(Rank $rank): Response
    {
        Gate::authorize('update', $rank);

        return Inertia::render('settings/ranks/edit', [
            'rank' => $rank,
        ]);
    }

    public function update(UpdateRankRequest $request, Rank $rank): RedirectResponse
    {
        Gate::authorize('update', $rank);

        $rank->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Rank updated.')]);

        return to_route('ranks.index');
    }

    public function destroy(Rank $rank): RedirectResponse
    {
        Gate::authorize('delete', $rank);

        $rank->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Rank deleted.')]);

        return to_route('ranks.index');
    }
}
