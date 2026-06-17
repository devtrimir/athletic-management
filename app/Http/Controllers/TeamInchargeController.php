<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Teams\AssignTeamInchargeAction;
use App\Actions\Teams\ChangeTeamInchargeAction;
use App\Actions\Teams\RemoveTeamInchargeAction;
use App\Http\Requests\Teams\AssignTeamInchargeRequest;
use App\Http\Requests\Teams\ChangeTeamInchargeRequest;
use App\Http\Requests\Teams\RemoveTeamInchargeRequest;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamInchargeController extends Controller
{
    public function store(AssignTeamInchargeRequest $request, Team $team, AssignTeamInchargeAction $assign): RedirectResponse
    {
        Gate::authorize('update', $team);

        $assign($team, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team incharge assigned.')]);

        return to_route('teams.show', $team);
    }

    public function update(ChangeTeamInchargeRequest $request, Team $team, ChangeTeamInchargeAction $change): RedirectResponse
    {
        Gate::authorize('update', $team);

        $change($team, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team incharge updated.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(RemoveTeamInchargeRequest $request, Team $team, RemoveTeamInchargeAction $remove): RedirectResponse
    {
        Gate::authorize('update', $team);

        $remove($team, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team incharge removed.')]);

        return to_route('teams.show', $team);
    }
}
