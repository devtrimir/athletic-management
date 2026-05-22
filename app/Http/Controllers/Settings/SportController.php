<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreSportRequest;
use App\Http\Requests\Settings\UpdateSportRequest;
use App\Models\Sport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SportController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Sport::class);

        $sports = Sport::where('organization_id', $request->user()->organization_id)
            ->orderBy('name_en')
            ->get();

        return Inertia::render('settings/sports/index', [
            'sports' => $sports,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Sport::class);

        return Inertia::render('settings/sports/create');
    }

    public function store(StoreSportRequest $request): RedirectResponse
    {
        Gate::authorize('create', Sport::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        Sport::create(array_merge($data, [
            'organization_id' => $orgId,
            'slug' => Str::slug($data['name_en']),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport created.')]);

        return to_route('sports.index');
    }

    public function edit(Sport $sport): Response
    {
        Gate::authorize('update', $sport);

        return Inertia::render('settings/sports/edit', [
            'sport' => $sport,
        ]);
    }

    public function update(UpdateSportRequest $request, Sport $sport): RedirectResponse
    {
        Gate::authorize('update', $sport);

        $data = $request->validated();

        $sport->update(array_merge($data, [
            'slug' => Str::slug($data['name_en']),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport updated.')]);

        return to_route('sports.index');
    }

    public function destroy(Sport $sport): RedirectResponse
    {
        Gate::authorize('delete', $sport);

        $sport->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport deleted.')]);

        return to_route('sports.index');
    }
}
