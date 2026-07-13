<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Teams\CreateTeamAction;
use App\Actions\Teams\UpdateTeamAction;
use App\Http\Requests\Teams\StoreTeamRequest;
use App\Http\Requests\Teams\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\District;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use App\Services\Teams\TeamListingService;
use App\Support\Teams\TeamProfileData;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(Request $request, TeamListingService $teamListing): Response
    {
        Gate::authorize('viewAny', Team::class);

        $orgId = (int) $request->user()->organization_id;
        $listing = $teamListing->forRequest($request, $orgId);

        $sessions = SportSession::select(['id', 'name', 'is_current'])
            ->where('organization_id', $orgId)
            ->orderByDesc('start_year')
            ->orderByDesc('id')
            ->get();

        $sports = Sport::select(['id', 'name', 'name_en'])
            ->orderBy('name')
            ->get();

        $districts = District::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $units = Unit::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('teams/index', [
            'teams' => $listing['teams'],
            'filters' => $listing['filters'],
            'defaultSessionId' => $listing['defaultSessionId'],
            'selectedSessionId' => $listing['selectedSessionId'],
            'sessions' => $sessions,
            'sports' => $sports,
            'districts' => $districts,
            'units' => $units,
        ]);
    }

    public function printRoster(Request $request, TeamListingService $teamListing, TeamProfileData $profileData): Response
    {
        Gate::authorize('viewAny', Team::class);

        $orgId = (int) $request->user()->organization_id;
        $listing = $teamListing->forPrintRequest($request, $orgId);

        return Inertia::render('teams/print', $profileData->printTeams(
            $listing['teams'],
            $orgId,
            $listing['selectedSessionId'],
        ));
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Team::class);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('teams/create', $this->formOptions($orgId));
    }

    public function store(StoreTeamRequest $request, CreateTeamAction $createTeam): RedirectResponse
    {
        Gate::authorize('create', Team::class);

        $team = $createTeam(
            $request->validated(),
            (int) $request->user()->organization_id,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team created.')]);

        return to_route('teams.show', $team);
    }

    public function show(Team $team, Request $request, TeamProfileData $profileData): Response
    {
        Gate::authorize('view', $team);

        $sessionId = $request->input('filter.session_id');

        return Inertia::render('teams/show', $profileData->overview(
            $team,
            (int) $request->user()->organization_id,
            is_numeric($sessionId) ? (int) $sessionId : null,
        ));
    }

    public function edit(Team $team, Request $request): Response
    {
        Gate::authorize('update', $team);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('teams/edit', array_merge(
            $this->formOptions($orgId),
            ['team' => (new TeamResource(
                $team->load(['sport:id,name', 'session:id,name', 'district:id,name', 'unit:id,name,district_id'])
            ))->resolve()],
        ));
    }

    public function update(UpdateTeamRequest $request, Team $team, UpdateTeamAction $updateTeam): RedirectResponse
    {
        Gate::authorize('update', $team);

        $updateTeam($team, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team updated.')]);

        return to_route('teams.show', $team);
    }

    public function destroy(Team $team): RedirectResponse
    {
        Gate::authorize('delete', $team);

        $team->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team deleted.')]);

        return to_route('teams.index');
    }

    /**
     * @return array{sessions: Collection, sports: Collection, districts: Collection, units: Collection}
     */
    private function formOptions(int $orgId): array
    {
        return [
            'sessions' => SportSession::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'sports' => Sport::select(['id', 'name', 'name_en'])
                ->orderBy('name')
                ->get(),
            'districts' => District::select(['id', 'name'])
                ->orderBy('name')
                ->get(),
            'units' => Unit::select(['id', 'name', 'district_id'])
                ->orderBy('name')
                ->get(),
        ];
    }
}
