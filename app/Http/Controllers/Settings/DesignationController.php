<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreDesignationRequest;
use App\Http\Requests\Settings\UpdateDesignationRequest;
use App\Models\Designation;
use App\Models\Rank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DesignationController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Designation::class);

        $designations = Designation::with('rank')
            ->orderBy('designation_order')
            ->get();

        return Inertia::render('settings/designations/index', [
            'designations' => $designations,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Designation::class);

        $ranks = Rank::orderBy('rank_order')->get(['id', 'code', 'name_en']);

        return Inertia::render('settings/designations/create', [
            'ranks' => $ranks,
        ]);
    }

    public function store(StoreDesignationRequest $request): RedirectResponse
    {
        Gate::authorize('create', Designation::class);

        Designation::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Designation created.')]);

        return to_route('designations.index');
    }

    public function storeInline(StoreDesignationRequest $request): JsonResponse
    {
        Gate::authorize('create', Designation::class);

        $designation = Designation::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Designation created.')]);

        return response()->json([
            'designation' => [
                'code' => $designation->code,
                'name_en' => $designation->name_en,
                'name_hi' => $designation->name_hi,
                'short_name' => $designation->short_name,
                'designation_order' => $designation->designation_order,
                'mapped_rank_code' => $designation->mapped_rank_code,
                'designation_type' => $designation->designation_type,
                'is_active' => $designation->is_active,
            ],
        ]);
    }

    public function edit(Designation $designation): Response
    {
        Gate::authorize('update', $designation);

        $ranks = Rank::orderBy('rank_order')->get(['id', 'code', 'name_en']);

        return Inertia::render('settings/designations/edit', [
            'designation' => $designation->load('rank'),
            'ranks' => $ranks,
        ]);
    }

    public function update(UpdateDesignationRequest $request, Designation $designation): RedirectResponse
    {
        Gate::authorize('update', $designation);

        $designation->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Designation updated.')]);

        return to_route('designations.index');
    }

    public function destroy(Designation $designation): RedirectResponse
    {
        Gate::authorize('delete', $designation);

        $designation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Designation deleted.')]);

        return to_route('designations.index');
    }
}
