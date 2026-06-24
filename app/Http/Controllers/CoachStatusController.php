<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\ChangeCoachStatusRequest;
use App\Models\Coach;
use App\Models\CoachStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachStatusController extends Controller
{
    public function store(ChangeCoachStatusRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('manageStatus', $coach);

        $data = $request->validated();

        DB::transaction(function () use ($coach, $data, $request): void {
            CoachStatusHistory::create([
                'coach_id' => $coach->id,
                'status' => $data['status'],
                'effective_on' => $data['effective_on'],
                'reason' => $data['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $coach->update(['coach_status' => $data['status']]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Status updated.')]);

        return to_route('coaches.status', $coach);
    }
}
