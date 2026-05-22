<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreTournamentTierRequest;
use App\Http\Requests\Settings\UpdateTournamentTierRequest;
use App\Models\TournamentTier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TournamentTierController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', TournamentTier::class);

        $tiers = TournamentTier::orderByDesc('weight')->get();

        return Inertia::render('settings/tournament-tiers/index', [
            'tiers' => $tiers,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', TournamentTier::class);

        return Inertia::render('settings/tournament-tiers/create');
    }

    public function store(StoreTournamentTierRequest $request): RedirectResponse
    {
        Gate::authorize('create', TournamentTier::class);

        TournamentTier::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament tier created.')]);

        return to_route('tournament-tiers.index');
    }

    public function edit(TournamentTier $tournamentTier): Response
    {
        Gate::authorize('update', $tournamentTier);

        return Inertia::render('settings/tournament-tiers/edit', [
            'tier' => $tournamentTier,
        ]);
    }

    public function update(UpdateTournamentTierRequest $request, TournamentTier $tournamentTier): RedirectResponse
    {
        Gate::authorize('update', $tournamentTier);

        $tournamentTier->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament tier updated.')]);

        return to_route('tournament-tiers.index');
    }

    public function destroy(TournamentTier $tournamentTier): RedirectResponse
    {
        Gate::authorize('delete', $tournamentTier);

        $tournamentTier->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament tier deleted.')]);

        return to_route('tournament-tiers.index');
    }
}
