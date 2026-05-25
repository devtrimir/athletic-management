<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachRequest;
use App\Http\Requests\Coaches\UpdateCoachRequest;
use App\Http\Resources\CoachResource;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CoachController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Coach::class);

        $coaches = QueryBuilder::for(Coach::class)
            ->allowedFilters([
                AllowedFilter::exact('nis_certified'),
                AllowedFilter::callback('has_member', function ($query, $value): void {
                    if ($value === 'true' || $value === true) {
                        $query->whereNotNull('member_id');
                    } else {
                        $query->whereNull('member_id');
                    }
                }),
                AllowedFilter::partial('q', 'full_name_hi'),
            ])
            ->allowedSorts(['full_name_hi', 'pno', 'created_at'])
            ->defaultSort('full_name_hi')
            ->with('member:id,member_code,full_name_hi,pno,rank')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('coaches/index', [
            'coaches' => $coaches,
            'filters' => $request->query('filter', []),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Coach::class);

        return Inertia::render('coaches/create');
    }

    public function store(StoreCoachRequest $request): RedirectResponse
    {
        Gate::authorize('create', Coach::class);

        $data = $request->validated();
        $data['organization_id'] = (int) $request->user()->organization_id;

        $coach = Coach::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach created.')]);

        return to_route('coaches.show', $coach);
    }

    public function show(Coach $coach): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', [
            'coach' => (new CoachResource($coach))->resolve(),
            'member' => Inertia::defer(fn () => $coach->member_id
                ? Member::withoutGlobalScopes()->find($coach->member_id, ['id', 'member_code', 'full_name_hi', 'full_name_en', 'pno', 'rank', 'mobile'])
                : null
            ),
            'coachTeams' => Inertia::defer(fn () => CoachAssignment::where('coach_id', $coach->id)
                ->with(['team:id,name_hi,sport_id', 'team.sport:id,name_hi', 'session:id,name'])
                ->orderByDesc('id')
                ->get()
                ->map(fn ($ca) => [
                    'id' => $ca->id,
                    'role' => $ca->role,
                    'team' => $ca->team ? ['id' => $ca->team->id, 'name_hi' => $ca->team->name_hi] : null,
                    'sport' => $ca->team?->sport ? ['id' => $ca->team->sport->id, 'name' => $ca->team->sport->name] : null,
                    'session' => $ca->session ? ['id' => $ca->session->id, 'name' => $ca->session->name] : null,
                ])),
        ]);
    }

    public function edit(Coach $coach): Response
    {
        Gate::authorize('update', $coach);

        return Inertia::render('coaches/edit', [
            'coach' => $coach->load('member:id,member_code,full_name_hi,full_name_en,pno,rank,player_category,player_level,current_status'),
        ]);
    }

    public function update(UpdateCoachRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('update', $coach);

        $coach->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach updated.')]);

        return to_route('coaches.show', $coach);
    }

    public function destroy(Coach $coach): RedirectResponse
    {
        Gate::authorize('delete', $coach);

        $coach->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Coach deleted.')]);

        return to_route('coaches.index');
    }
}
