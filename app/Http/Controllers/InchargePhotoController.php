<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Incharges\StoreInchargePhotoRequest;
use App\Models\Incharge;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InchargePhotoController extends Controller
{
    public function store(StoreInchargePhotoRequest $request, Incharge $incharge): RedirectResponse
    {
        Gate::authorize('update', $incharge);

        $oldPath = $incharge->photo_path;

        $path = $request->file('photo')->store(
            "incharge-photos/{$incharge->organization_id}",
            'public',
        );

        $incharge->update(['photo_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('public')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo updated.')]);

        return to_route('incharges.show', $incharge);
    }

    public function destroy(Incharge $incharge): RedirectResponse
    {
        Gate::authorize('update', $incharge);

        if ($incharge->photo_path !== null) {
            Storage::disk('public')->delete($incharge->photo_path);
            $incharge->update(['photo_path' => null]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo removed.')]);

        return to_route('incharges.show', $incharge);
    }
}
