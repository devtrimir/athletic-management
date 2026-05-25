<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreLegacyAchievementRequest;
use App\Http\Requests\Members\UpdateLegacyAchievementRequest;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberLegacyAchievementController extends Controller
{
    public function store(StoreLegacyAchievementRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        $member->legacyAchievements()->create(array_merge(
            $request->validated(),
            ['organization_id' => $member->organization_id],
        ));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement added.')]);

        return to_route('members.show', $member);
    }

    public function update(UpdateLegacyAchievementRequest $request, Member $member, MemberLegacyAchievement $legacyAchievement): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        abort_if($legacyAchievement->member_id !== $member->id, 404);

        $legacyAchievement->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement updated.')]);

        return to_route('members.show', $member);
    }

    public function destroy(Member $member, MemberLegacyAchievement $legacyAchievement): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        abort_if($legacyAchievement->member_id !== $member->id, 404);

        $legacyAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement removed.')]);

        return to_route('members.show', $member);
    }
}
