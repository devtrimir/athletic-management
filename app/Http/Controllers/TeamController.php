<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Teams\StoreTeamRequest;
use App\Http\Requests\Teams\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Team::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        $teams = QueryBuilder::for(Team::class)
            ->allowedFilters([
                AllowedFilter::exact('session_id'),
                AllowedFilter::exact('sport_id'),
                AllowedFilter::exact('unit_id'),
                AllowedFilter::partial('q', 'name_hi'),
            ])
            ->allowedSorts(['name_hi', 'created_at'])
            ->defaultSort('name_hi')
            ->withCount(['teamMembers as players_count', 'coachAssignments as coaches_count'])
            ->with(['sport:id,name_hi', 'session:id,name', 'unit:id,name_hi'])
            ->when(
                ! $request->has('filter.session_id') && $defaultSessionId,
                fn ($q) => $q->where('session_id', $defaultSessionId)
            )
            ->paginate(25)
            ->withQueryString();

        $sessions = SportSession::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        $sports = Sport::select(['id', 'name_hi'])
            ->orderBy('name_hi')
            ->get();

        $units = Unit::select(['id', 'name_hi'])
            ->orderBy('name_hi')
            ->get();

        return Inertia::render('teams/index', [
            'teams' => $teams,
            'filters' => $request->query('filter', []),
            'defaultSessionId' => $defaultSessionId,
            'sessions' => $sessions,
            'sports' => $sports,
            'units' => $units,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Team::class);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('teams/create', $this->formOptions($orgId));
    }

    public function store(StoreTeamRequest $request): RedirectResponse
    {
        Gate::authorize('create', Team::class);

        $data = $request->validated();
        $data['organization_id'] = (int) $request->user()->organization_id;

        $team = Team::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team created.')]);

        return to_route('teams.show', $team);
    }

    public function show(Team $team): Response
    {
        Gate::authorize('view', $team);

        $team->load(['sport:id,name_hi', 'session:id,name', 'unit:id,name_hi']);

        return Inertia::render('teams/show', [
            'team' => new TeamResource($team),
            'counts' => Inertia::defer(fn () => [
                'players_count' => $team->teamMembers()->count(),
                'coaches_count' => $team->coachAssignments()->count(),
            ]),
            'members' => Inertia::defer(fn () => $team->teamMembers()
                ->with(['member:id,full_name_hi,member_code,pno', 'session:id,name'])
                ->orderBy('id')
                ->get()
                ->map(fn ($tm) => [
                    'id' => $tm->id,
                    'role' => $tm->role,
                    'joined_on' => $tm->joined_on?->toDateString(),
                    'left_on' => $tm->left_on?->toDateString(),
                    'member' => $tm->member ? [
                        'id' => $tm->member->id,
                        'full_name_hi' => $tm->member->full_name_hi,
                        'member_code' => $tm->member->member_code,
                        'pno' => $tm->member->pno,
                    ] : null,
                    'session' => $tm->session ? [
                        'id' => $tm->session->id,
                        'name' => $tm->session->name,
                    ] : null,
                ])),
            'coaches' => Inertia::defer(fn () => $team->coachAssignments()
                ->with(['coach:id,full_name_hi,pno', 'session:id,name'])
                ->orderBy('id')
                ->get()
                ->map(fn ($ca) => [
                    'id' => $ca->id,
                    'role' => $ca->role,
                    'coach' => $ca->coach ? [
                        'id' => $ca->coach->id,
                        'full_name_hi' => $ca->coach->full_name_hi,
                        'pno' => $ca->coach->pno,
                    ] : null,
                    'session' => $ca->session ? [
                        'id' => $ca->session->id,
                        'name' => $ca->session->name,
                    ] : null,
                ])),
        ]);
    }

    public function edit(Team $team, Request $request): Response
    {
        Gate::authorize('update', $team);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('teams/edit', array_merge(
            $this->formOptions($orgId),
            ['team' => $team->load(['sport:id,name_hi', 'session:id,name', 'unit:id,name_hi'])],
        ));
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $team->update($request->validated());

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
     * @return array{sessions: Collection, sports: Collection, units: Collection}
     */
    private function formOptions(int $orgId): array
    {
        return [
            'sessions' => SportSession::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get(),
            'sports' => Sport::select(['id', 'name_hi'])
                ->orderBy('name_hi')
                ->get(),
            'units' => Unit::select(['id', 'name_hi'])
                ->orderBy('name_hi')
                ->get(),
        ];
    }
}
