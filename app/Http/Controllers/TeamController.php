<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Teams\CreateTeamAction;
use App\Actions\Teams\UpdateTeamAction;
use App\Http\Requests\Teams\StoreTeamRequest;
use App\Http\Requests\Teams\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\CoachAssignment;
use App\Models\District;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSessionStatus;
use App\Models\Unit;
use App\Support\Teams\TeamProfileData;
use App\Support\Teams\TeamSessionStatusManager;
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
        $selectedSessionId = (int) ($request->input('filter.session_id') ?: $defaultSessionId ?: 0);

        $teamSessionStatusManager = app(TeamSessionStatusManager::class);

        $teams = QueryBuilder::for(Team::class)
            ->allowedFilters([
                AllowedFilter::callback('session_id', fn ($query, $value): null => null),
                AllowedFilter::exact('sport_id'),
                AllowedFilter::exact('district_id'),
                AllowedFilter::exact('unit_id'),
                AllowedFilter::exact('location_type'),
                AllowedFilter::callback('is_active', function ($query, $value) use ($selectedSessionId): void {
                    $isActive = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

                    $query->where(function ($statusAwareQuery) use ($selectedSessionId, $isActive): void {
                        $statusAwareQuery->whereHas('sessionStatuses', function ($statusQuery) use ($selectedSessionId, $isActive): void {
                            $statusQuery->where('session_id', $selectedSessionId);

                            if ($isActive === true) {
                                $statusQuery->where('status', TeamSessionStatus::STATUS_ACTIVE);
                            }

                            if ($isActive === false) {
                                $statusQuery->where('status', '!=', TeamSessionStatus::STATUS_ACTIVE);
                            }
                        })->orWhere(function ($legacyQuery) use ($selectedSessionId, $isActive): void {
                            $legacyQuery->whereDoesntHave('sessionStatuses', fn ($statusQuery) => $statusQuery->where('session_id', $selectedSessionId));

                            if ($isActive === true) {
                                $legacyQuery->where('is_active', true)->where('session_id', $selectedSessionId);
                            }

                            if ($isActive === false) {
                                $legacyQuery->where(function ($inactiveLegacyQuery) use ($selectedSessionId): void {
                                    $inactiveLegacyQuery->where('is_active', false)->orWhere('session_id', '!=', $selectedSessionId);
                                });
                            }
                        });
                    });
                }),
                AllowedFilter::callback('q', function ($query, $value) {
                    $term = '%'.mb_strtolower((string) $value).'%';
                    $query->where(function ($q) use ($term) {
                        $q->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(in_charge, \'\')) LIKE ?', [$term])
                            ->orWhereHas('currentInchargeAssignment', function ($assignmentQuery) use ($term): void {
                                $assignmentQuery
                                    ->whereRaw('LOWER(full_name) LIKE ?', [$term])
                                    ->orWhereRaw('LOWER(COALESCE(pno, \'\')) LIKE ?', [$term]);
                            });
                    });
                }),
                AllowedFilter::callback('pno', function ($query, $value) {
                    $term = '%'.mb_strtolower(trim((string) $value)).'%';
                    $teamIdsByMember = TeamMember::whereHas(
                        'member',
                        fn ($m) => $m->whereRaw('LOWER(pno) LIKE ?', [$term])
                    )->pluck('team_id');
                    $teamIdsByCoach = CoachAssignment::whereHas(
                        'coach',
                        fn ($c) => $c->whereRaw('LOWER(pno) LIKE ?', [$term])
                    )->pluck('team_id');
                    $teamIds = $teamIdsByMember->merge($teamIdsByCoach)->unique()->values();
                    $query->whereIn('id', $teamIds);
                }),
            ])
            ->allowedSorts(['name', 'created_at'])
            ->defaultSort('name')
            ->withCount([
                'teamMembers as players_count' => fn ($query) => $query
                    ->where('session_id', $selectedSessionId)
                    ->whereNull('left_on'),
                'teamMembers as male_players_count' => fn ($query) => $query->whereHas(
                    'member',
                    fn ($memberQuery) => $memberQuery->where('gender', 'M')
                )->where('session_id', $selectedSessionId)->whereNull('left_on'),
                'teamMembers as female_players_count' => fn ($query) => $query->whereHas(
                    'member',
                    fn ($memberQuery) => $memberQuery->where('gender', 'F')
                )->where('session_id', $selectedSessionId)->whereNull('left_on'),
                'teamMembers as captains_count' => fn ($query) => $query
                    ->where('session_id', $selectedSessionId)
                    ->whereNull('left_on')
                    ->where('role', 'CAPTAIN'),
                'teamMembers as reserves_count' => fn ($query) => $query
                    ->where('session_id', $selectedSessionId)
                    ->whereNull('left_on')
                    ->where('role', 'RESERVE'),
                'teamMemberMovements as removed_players_count' => fn ($query) => $query
                    ->where('session_id', $selectedSessionId)
                    ->where('action', 'REMOVED'),
                'coachAssignments as coaches_count' => fn ($query) => $query->where('session_id', $selectedSessionId),
            ])
            ->with([
                'sport:id,name',
                'session:id,name',
                'district:id,name',
                'unit:id,name,district_id',
                'currentInchargeAssignment',
            ])
            ->when(
                ! $request->has('filter.is_active'),
                fn ($q) => $q->where('is_active', true)
            )
            ->paginate(25);

        $sessionStatuses = $teamSessionStatusManager->statusesForTeams($teams->getCollection(), $selectedSessionId);

        $teams
            ->through(function (Team $team) use ($sessionStatuses): Team {
                /** @var TeamSessionStatus|null $sessionStatus */
                $sessionStatus = $sessionStatuses->get($team->id);
                $status = $sessionStatus?->status ?? TeamSessionStatus::STATUS_INACTIVE;

                $team->setAttribute(
                    'listing_is_active',
                    $team->is_active && $status === TeamSessionStatus::STATUS_ACTIVE,
                );
                $team->setAttribute('session_status', $status);
                $team->setAttribute('session_status_label', match ($status) {
                    TeamSessionStatus::STATUS_ACTIVE => __('Active'),
                    TeamSessionStatus::STATUS_CARRIED_FORWARD => __('Carried forward'),
                    default => __('Inactive'),
                });

                return $team;
            })
            ->withQueryString();

        $sessions = SportSession::select(['id', 'name', 'is_current'])
            ->where('organization_id', $orgId)
            ->orderByDesc('start_year')
            ->orderByDesc('id')
            ->get();

        $sports = Sport::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $districts = District::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $units = Unit::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('teams/index', [
            'teams' => $teams,
            'filters' => array_merge($request->query('filter', []), [
                'session_id' => $selectedSessionId > 0 ? (string) $selectedSessionId : null,
            ]),
            'defaultSessionId' => $defaultSessionId,
            'selectedSessionId' => $selectedSessionId > 0 ? $selectedSessionId : null,
            'sessions' => $sessions,
            'sports' => $sports,
            'districts' => $districts,
            'units' => $units,
        ]);
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
            'sports' => Sport::select(['id', 'name'])
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
