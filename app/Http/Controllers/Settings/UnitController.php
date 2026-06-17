<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUnitRequest;
use App\Http\Requests\Settings\UpdateUnitRequest;
use App\Models\District;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Unit::class);

        $units = Unit::with('district')
            ->where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/units/index', [
            'units' => $units,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Unit::class);

        $districts = District::orderBy('name')->get(['id', 'name']);

        return Inertia::render('settings/units/create', [
            'districts' => $districts,
        ]);
    }

    public function store(StoreUnitRequest $request): RedirectResponse
    {
        Gate::authorize('create', Unit::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        Unit::create(array_merge($data, ['organization_id' => $orgId]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit created.')]);

        return to_route('units.index');
    }

    public function edit(Unit $unit): Response
    {
        Gate::authorize('update', $unit);

        $districts = District::orderBy('name')->get(['id', 'name']);

        return Inertia::render('settings/units/edit', [
            'unit' => $unit,
            'districts' => $districts,
        ]);
    }

    public function update(UpdateUnitRequest $request, Unit $unit): RedirectResponse
    {
        Gate::authorize('update', $unit);

        $unit->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit updated.')]);

        return to_route('units.index');
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        Gate::authorize('delete', $unit);

        $unit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit deleted.')]);

        return to_route('units.index');
    }
}
