<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachSportRequest;
use App\Models\Coach;
use App\Models\CoachSport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachSportController extends Controller
{
    public function store(StoreCoachSportRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('updateSports', $coach);

        $data = $request->validated();
        $data['is_primary'] = (bool) ($data['is_primary'] ?? false);

        DB::transaction(function () use ($coach, $data): void {
            if ($data['is_primary']) {
                CoachSport::query()
                    ->where('coach_id', $coach->id)
                    ->update(['is_primary' => false]);
            }

            CoachSport::query()->updateOrCreate(
                [
                    'coach_id' => $coach->id,
                    'sport_id' => (int) $data['sport_id'],
                ],
                [
                    'is_primary' => $data['is_primary'],
                    'level_master_id' => $data['level_master_id'] ?? null,
                    'level' => $data['level'] ?? null,
                    'sport_event' => $data['sport_event'] ?? null,
                    'effective_from' => $data['effective_from'] ?? null,
                    'effective_to' => $data['effective_to'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ],
            );
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport specialization added.')]);

        return to_route('coaches.sports', $coach);
    }

    public function destroy(Coach $coach, CoachSport $coachSport): RedirectResponse
    {
        Gate::authorize('updateSports', $coach);

        abort_if($coachSport->coach_id !== $coach->id, 404);

        $coachSport->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport specialization removed.')]);

        return to_route('coaches.sports', $coach);
    }
}
