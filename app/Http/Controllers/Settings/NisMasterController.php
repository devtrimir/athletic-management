<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\NisMaster;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class NisMasterController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', NisMaster::class);

        return Inertia::render('settings/nis-masters/index', [
            'masters' => NisMaster::query()
                ->ordered()
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', NisMaster::class);

        NisMaster::create($request->validate([
            'kind' => ['required', 'string', 'max:50'],
            'code' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('NIS master created.')]);

        return back();
    }
}
