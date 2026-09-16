<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUnitTypeRequest;
use App\Http\Requests\Settings\UpdateUnitTypeRequest;
use App\Models\UnitType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UnitTypeController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', UnitType::class);

        $unitTypes = UnitType::withCount('units')->ordered()->get();

        return Inertia::render('settings/unit-types/index', [
            'unitTypes' => $unitTypes,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', UnitType::class);

        return Inertia::render('settings/unit-types/create');
    }

    public function store(StoreUnitTypeRequest $request): RedirectResponse
    {
        Gate::authorize('create', UnitType::class);

        UnitType::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit type created.')]);

        return to_route('unit-types.index');
    }

    public function edit(UnitType $unitType): Response
    {
        Gate::authorize('update', $unitType);

        return Inertia::render('settings/unit-types/edit', [
            'unitType' => $unitType,
        ]);
    }

    public function update(UpdateUnitTypeRequest $request, UnitType $unitType): RedirectResponse
    {
        Gate::authorize('update', $unitType);

        $unitType->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit type updated.')]);

        return to_route('unit-types.index');
    }

    public function destroy(UnitType $unitType): RedirectResponse
    {
        Gate::authorize('delete', $unitType);

        if ($unitType->units()->exists()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => __('This unit type is still in use and cannot be deleted.'),
            ]);

            return to_route('unit-types.index');
        }

        $unitType->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit type deleted.')]);

        return to_route('unit-types.index');
    }
}
