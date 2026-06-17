<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreDistrictRequest;
use App\Http\Requests\Settings\UpdateDistrictRequest;
use App\Models\District;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DistrictController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', District::class);

        $districts = District::orderBy('name')->get();

        return Inertia::render('settings/districts/index', [
            'districts' => $districts,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', District::class);

        return Inertia::render('settings/districts/create');
    }

    public function store(StoreDistrictRequest $request): RedirectResponse
    {
        Gate::authorize('create', District::class);

        District::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('District created.')]);

        return to_route('districts.index');
    }

    public function edit(District $district): Response
    {
        Gate::authorize('update', $district);

        return Inertia::render('settings/districts/edit', [
            'district' => $district,
        ]);
    }

    public function update(UpdateDistrictRequest $request, District $district): RedirectResponse
    {
        Gate::authorize('update', $district);

        $district->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('District updated.')]);

        return to_route('districts.index');
    }

    public function destroy(District $district): RedirectResponse
    {
        Gate::authorize('delete', $district);

        $district->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('District deleted.')]);

        return to_route('districts.index');
    }
}
