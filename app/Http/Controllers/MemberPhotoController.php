<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberPhotoRequest;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MemberPhotoController extends Controller
{
    public function store(StoreMemberPhotoRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('update', $member);

        $oldPath = $member->photo_path;

        $path = $request->file('photo')->store(
            "member-photos/{$member->organization_id}",
            'public',
        );

        $member->update(['photo_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('public')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo updated.')]);

        return to_route('members.show', $member);
    }

    public function destroy(Member $member): RedirectResponse
    {
        Gate::authorize('update', $member);

        if ($member->photo_path !== null) {
            Storage::disk('public')->delete($member->photo_path);
            $member->update(['photo_path' => null]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo removed.')]);

        return to_route('members.show', $member);
    }
}
