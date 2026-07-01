<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Tournaments\StoreTournamentRequest;
use App\Http\Requests\Tournaments\UpdateTournamentRequest;
use App\Models\Achievement;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Models\TournamentTier;
use App\Support\Tournaments\TournamentProfileData;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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
        $selectedSessionId = is_numeric($request->input('filter.session_id'))
            ? (int) $request->input('filter.session_id')
            : ($defaultSessionId ? (int) $defaultSessionId : null);

        $tournaments = QueryBuilder::for(Tournament::class)
            ->allowedFilters([
                AllowedFilter::exact('session_id'),
                AllowedFilter::exact('tier_id'),
                AllowedFilter::exact('sport_id'),
                AllowedFilter::partial('q', 'name'),
            ])
            ->allowedSorts(['name', 'date_from', 'created_at'])
            ->defaultSort('-date_from')
            ->withCount('events')
            ->addSelect([
                'participants_count' => Participation::query()
                    ->selectRaw('count(*)')
                    ->join('events', 'events.id', '=', 'participations.event_id')
                    ->whereColumn('events.tournament_id', 'tournaments.id'),
                'teams_count' => Participation::query()
                    ->selectRaw('count(distinct participations.team_id)')
                    ->join('events', 'events.id', '=', 'participations.event_id')
                    ->whereColumn('events.tournament_id', 'tournaments.id')
                    ->whereNotNull('participations.team_id'),
                'medals_count' => Achievement::query()
                    ->selectRaw('count(*)')
                    ->join('participations', 'participations.id', '=', 'achievements.participation_id')
                    ->join('events', 'events.id', '=', 'participations.event_id')
                    ->whereColumn('events.tournament_id', 'tournaments.id'),
            ])
            ->with(['session:id,name', 'tier:id,code,label_hi,label_en', 'sport:id,name'])
            ->when(
                ! $request->has('filter.session_id') && $defaultSessionId,
                fn ($q) => $q->where('session_id', $defaultSessionId)
            )
            ->paginate(25)
            ->withQueryString();

        $sessions = SportSession::select(['id', 'name'])
            ->where('organization_id', $orgId)
            ->orderByDesc('start_year')
            ->orderByDesc('id')
            ->get();

        $sports = Sport::select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $tiers = TournamentTier::select(['id', 'code', 'label_hi', 'label_en'])
            ->orderByDesc('weight')
            ->get();

        return Inertia::render('tournaments/index', [
            'tournaments' => $tournaments,
            'filters' => array_merge($request->query('filter', []), [
                'session_id' => $selectedSessionId ? (string) $selectedSessionId : null,
            ]),
            'defaultSessionId' => $defaultSessionId,
            'selectedSessionId' => $selectedSessionId,
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
        $sportIds = $this->requestedSportIds($request, $data);
        $data['organization_id'] = (int) $request->user()->organization_id;
        $data = Arr::except($data, ['sport_ids']);
        $data['sport_id'] = $sportIds[0] ?? null;

        $tournament = Tournament::create($data);
        if (! empty($sportIds)) {
            $tournament->sports()->sync($sportIds);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Tournament created.')]);

        return to_route('tournaments.show', $tournament);
    }

    public function show(Tournament $tournament, TournamentProfileData $profileData): Response
    {
        Gate::authorize('view', $tournament);

        return Inertia::render('tournaments/show', $profileData->overview($tournament));
    }

    public function edit(Tournament $tournament, Request $request): Response
    {
        Gate::authorize('update', $tournament);

        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('tournaments/edit', array_merge(
            $this->formOptions($orgId),
            ['tournament' => $tournament->load(['session:id,name', 'tier:id,code,label_hi,label_en', 'sport:id,name', 'sports:id,name'])],
        ));
    }

    public function update(UpdateTournamentRequest $request, Tournament $tournament): RedirectResponse
    {
        Gate::authorize('update', $tournament);

        $data = $request->validated();
        $sportIds = $this->requestedSportIds($request, $data);

        $hasSportSelection = $request->has('sport_ids') || $request->has('sport_id');
        if ($hasSportSelection) {
            $data['sport_id'] = $sportIds[0] ?? null;
        }

        $data = Arr::except($data, ['sport_ids']);
        $tournament->update($data);

        if ($hasSportSelection) {
            $tournament->sports()->sync($sportIds);
        }

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
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'sports' => Sport::select(['id', 'name'])
                ->orderBy('name')
                ->get(),
            'tiers' => TournamentTier::select(['id', 'code', 'label_hi', 'label_en'])
                ->orderByDesc('weight')
                ->get(),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return list<int>
     */
    private function requestedSportIds(Request $request, array $validated): array
    {
        $rawIds = $request->has('sport_ids')
            ? ($validated['sport_ids'] ?? [])
            : ($request->has('sport_id') ? [$validated['sport_id'] ?? null] : []);

        $sportIds = array_values(array_unique(array_map(
            'intval',
            array_filter((array) $rawIds, static fn (int|string|null $id): bool => (string) $id !== ''),
        )));

        return array_values(array_filter($sportIds, static fn (int $id): bool => $id > 0));
    }
}
