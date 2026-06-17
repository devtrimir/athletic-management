<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachPhotoRequest;
use App\Models\Coach;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CoachPhotoController extends Controller
{
    public function store(StoreCoachPhotoRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('uploadMedia', $coach);

        $oldPath = $coach->photo_path;

        $path = $request->file('photo')->store(
            "coach-photos/{$coach->organization_id}",
            'public',
        );

        $coach->update(['photo_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('public')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo updated.')]);

        return to_route('coaches.show', $coach);
    }

    public function destroy(Coach $coach): RedirectResponse
    {
        Gate::authorize('deleteMedia', $coach);

        if ($coach->photo_path !== null) {
            Storage::disk('public')->delete($coach->photo_path);
            $coach->update(['photo_path' => null]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo removed.')]);

        return to_route('coaches.show', $coach);
    }
}
