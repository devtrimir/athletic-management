<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Incharges\StoreInchargeRequest;
use App\Http\Requests\Incharges\UpdateInchargeRequest;
use App\Models\Designation;
use App\Models\Incharge;
use App\Models\Rank;
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
                            ->orWhereRaw('LOWER(COALESCE(rank, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(designation, \'\')) LIKE ?', [$term]);
                    });
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'created_at'])
            ->defaultSort('full_name')
            ->withCount(['currentAssignments as current_teams_count', 'assignments as assignments_count'])
            ->paginate(25)
            ->withQueryString();

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

        return Inertia::render('incharges/print-preview', $profileData->print($incharge));
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
                'designation' => $incharge->designation,
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
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')
                ->get(['code', 'name', 'short_name', 'mapped_rank_code']),
        ];
    }
}
