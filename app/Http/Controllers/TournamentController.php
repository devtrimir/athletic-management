<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Tournaments\StoreTournamentRequest;
use App\Http\Requests\Tournaments\UpdateTournamentRequest;
use App\Http\Resources\TournamentResource;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class TournamentController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Tournament::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        $tournaments = QueryBuilder::for(Tournament::class)
            ->allowedFilters([
                AllowedFilter::exact('session_id'),
                AllowedFilter::exact('tier_id'),
                AllowedFilter::exact('sport_id'),
                AllowedFilter::partial('q', 'name_hi'),
            ])
            ->allowedSorts(['name_hi', 'date_from', 'created_at'])
            ->defaultSort('-date_from')
            ->withCount('events')
            ->with(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name'])
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

        $sports = Sport::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $tiers = TournamentTier::select(['id', 'code', 'label_hi'])
            ->orderByDesc('weight')
            ->get();

        return Inertia::render('tournaments/index', [
            'tournaments' => $tournaments,
            'filters' => $request->query('filter', []),
            'defaultSessionId' => $defaultSessionId,
            'sessions' => $sessions,
            'sports' => $sports,
            'tiers' => $tiers,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Tournament::class);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('tournaments/create', $this->formOptions($orgId));
    }

    public function store(StoreTournamentRequest $request): RedirectResponse
    {
        Gate::authorize('create', Tournament::class);

        $data = $request->validated();
        $data['organization_id'] = (int) $request->user()->organization_id;

        $tournament = Tournament::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament created.')]);

        return to_route('tournaments.show', $tournament);
    }

    public function show(Tournament $tournament): Response
    {
        Gate::authorize('view', $tournament);

        $tournament->load(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name']);

        $orgId = (int) $tournament->organization_id;

        $sports = Sport::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        return Inertia::render('tournaments/show', [
            'tournament' => new TournamentResource($tournament),
            'sports' => $sports,
            'events' => Inertia::defer(fn () => $tournament->events()
                ->with('sport:id,name')
                ->withCount('participations')
                ->orderBy('name_hi')
                ->get()
                ->map(fn ($event) => [
                    'id' => $event->id,
                    'name_hi' => $event->name_hi,
                    'discipline' => $event->discipline,
                    'weight_category' => $event->weight_category,
                    'gender_class' => $event->gender_class,
                    'participations_count' => $event->participations_count,
                    'sport' => $event->sport ? [
                        'id' => $event->sport->id,
                        'name' => $event->sport->name,
                    ] : null,
                ])),
        ]);
    }

    public function edit(Tournament $tournament, Request $request): Response
    {
        Gate::authorize('update', $tournament);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('tournaments/edit', array_merge(
            $this->formOptions($orgId),
            ['tournament' => $tournament->load(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name'])],
        ));
    }

    public function update(UpdateTournamentRequest $request, Tournament $tournament): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $tournament->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament updated.')]);

        return to_route('tournaments.show', $tournament);
    }

    public function destroy(Tournament $tournament): RedirectResponse
    {
        Gate::authorize('delete', $tournament);

        $tournament->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament deleted.')]);

        return to_route('tournaments.index');
    }

    /**
     * @return array{sessions: Collection, sports: Collection, tiers: Collection}
     */
    private function formOptions(int $orgId): array
    {
        return [
            'sessions' => SportSession::select(['id', 'name'])
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get(),
            'sports' => Sport::select(['id', 'name'])
                ->orderBy('name')
                ->get(),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi'])
                ->orderByDesc('weight')
                ->get(),
        ];
    }
}
