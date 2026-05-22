<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreSportSessionRequest;
use App\Http\Requests\Settings\UpdateSportSessionRequest;
use App\Models\SportSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SportSessionController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', SportSession::class);

        $sessions = SportSession::where('organization_id', $request->user()->organization_id)
            ->orderByDesc('start_year')
            ->get();

        return Inertia::render('settings/sessions/index', [
            'sessions' => $sessions,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', SportSession::class);

        return Inertia::render('settings/sessions/create');
    }

    public function store(StoreSportSessionRequest $request): RedirectResponse
    {
        Gate::authorize('create', SportSession::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        DB::transaction(function () use ($data, $orgId): void {
            if ($data['is_current']) {
                SportSession::where('organization_id', $orgId)
                    ->update(['is_current' => false]);
            }

            SportSession::create(array_merge($data, ['organization_id' => $orgId]));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Session created.')]);

        return to_route('sessions.index');
    }

    public function edit(SportSession $session): Response
    {
        Gate::authorize('update', $session);

        return Inertia::render('settings/sessions/edit', [
            'session' => $session,
        ]);
    }

    public function update(UpdateSportSessionRequest $request, SportSession $session): RedirectResponse
    {
        Gate::authorize('update', $session);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        DB::transaction(function () use ($data, $orgId, $session): void {
            if ($data['is_current']) {
                SportSession::where('organization_id', $orgId)
                    ->where('id', '!=', $session->id)
                    ->update(['is_current' => false]);
            }

            $session->update($data);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Session updated.')]);

        return to_route('sessions.index');
    }

    public function destroy(SportSession $session): RedirectResponse
    {
        Gate::authorize('delete', $session);

        $session->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Session deleted.')]);

        return to_route('sessions.index');
    }
}
