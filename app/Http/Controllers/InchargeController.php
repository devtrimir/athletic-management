<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Incharges\StoreInchargeRequest;
use App\Http\Requests\Incharges\UpdateInchargeRequest;
use App\Models\Incharge;
use App\Models\Rank;
use App\Models\TeamInchargeAssignment;
use App\Support\Incharges\InchargeProfileData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class InchargeController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Incharge::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $incharges = QueryBuilder::for(Incharge::query())
            ->allowedFilters([
                AllowedFilter::exact('is_active'),
                AllowedFilter::callback('q', function ($query, string $value): void {
                    $term = '%'.mb_strtolower($value).'%';
                    $query->where(function ($builder) use ($term): void {
                        $builder->whereRaw('LOWER(full_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(pno) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(rank, \'\')) LIKE ?', [$term]);
                    });
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'created_at'])
            ->defaultSort('full_name')
            ->with([
                'currentAssignments.team:id,name,sport_id,session_id,location_type,district_id,unit_id',
                'currentAssignments.team.sport:id,name',
                'currentAssignments.team.session:id,name',
                'currentAssignments.team.district:id,name',
                'currentAssignments.team.unit:id,name',
            ])
            ->paginate(25)
            ->withQueryString();

        $incharges->getCollection()->transform(function (Incharge $incharge): Incharge {
            $currentTeamAssignments = $incharge->currentAssignments
                ->map(function (TeamInchargeAssignment $assignment): array {
                    $team = $assignment->team;

                    return [
                        'team' => $team
                            ? [
                                'id' => $team->id,
                                'name' => $team->name,
                                'location_type' => $team->location_type,
                                'location_label' => $team->location_label,
                                'sport' => $team->sport?->only(['id', 'name']),
                                'session' => $team->session?->only(['id', 'name']),
                            ]
                            : null,
                        'assigned_at' => $assignment->assigned_at
                            ? $assignment->assigned_at->format('Y-m-d')
                            : null,
                    ];
                })
                ->values()
                ->all();

            $incharge->setAttribute('current_team_assignments', $currentTeamAssignments);

            return $incharge;
        });

        return Inertia::render('incharges/index', [
            'incharges' => $incharges,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Incharge::class);

        return Inertia::render('incharges/create', $this->formOptions());
    }

    public function store(StoreInchargeRequest $request): RedirectResponse
    {
        Gate::authorize('create', Incharge::class);

        $incharge = Incharge::create([
            ...$request->validated(),
            'organization_id' => (int) $request->user()->organization_id,
            'is_active' => $request->boolean('is_active', true),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge created.')]);

        return to_route('incharges.show', $incharge);
    }

    public function show(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->overview($incharge));
    }

    public function preview(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/print', $profileData->print($incharge));
    }

    public function edit(Incharge $incharge): Response
    {
        Gate::authorize('update', $incharge);

        return Inertia::render('incharges/edit', [
            'incharge' => [
                'id' => $incharge->id,
                'full_name' => $incharge->full_name,
                'pno' => $incharge->pno,
                'rank' => $incharge->rank,
                'mobile' => $incharge->mobile,
                'email' => $incharge->email,
                'is_active' => $incharge->is_active,
                'remarks' => $incharge->remarks,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(UpdateInchargeRequest $request, Incharge $incharge): RedirectResponse
    {
        Gate::authorize('update', $incharge);

        $incharge->update([
            ...$request->validated(),
            'is_active' => $request->boolean('is_active'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge updated.')]);

        return to_route('incharges.show', $incharge);
    }

    public function destroy(Incharge $incharge): RedirectResponse
    {
        Gate::authorize('delete', $incharge);

        $incharge->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incharge deleted.')]);

        return to_route('incharges.index');
    }

    /** @return array<string, mixed> */
    private function formOptions(): array
    {
        return [
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name']),
        ];
    }
}
