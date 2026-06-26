<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Member;
use App\Support\Members\MemberProfileData;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MemberProfileTabController extends Controller
{
    public function teams(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->teams($member));
    }

    public function events(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->events($member));
    }

    public function performance(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->performance($member));
    }

    public function externalCoaching(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->externalCoaching($member));
    }

    public function specialAchievements(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->specialAchievements($member));
    }

    public function promotions(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->promotions($member));
    }

    public function changelog(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->changelog($member));
    }

    public function media(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->media($member));
    }

    public function status(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->status($member));
    }
}
