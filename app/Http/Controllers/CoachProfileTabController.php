<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Coach;
use App\Support\Coaches\CoachProfileData;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CoachProfileTabController extends Controller
{
    public function assignments(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->assignments($coach));
    }

    public function sports(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->sports($coach));
    }

    public function certifications(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->certifications($coach));
    }

    public function achievements(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->achievements($coach));
    }

    public function specialAchievements(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->specialAchievements($coach));
    }

    public function promotions(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->promotions($coach));
    }

    public function media(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->media($coach));
    }

    public function aliases(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->aliases($coach));
    }

    public function changelog(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->changelog($coach));
    }

    public function status(Coach $coach, CoachProfileData $profileData): Response
    {
        Gate::authorize('view', $coach);

        return Inertia::render('coaches/show', $profileData->status($coach));
    }
}
