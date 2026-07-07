<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Incharge;
use App\Support\Incharges\InchargeProfileData;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class InchargeProfileTabController extends Controller
{
    public function profile(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->profile($incharge));
    }

    public function achievements(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->achievements($incharge));
    }

    public function specialAchievements(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->specialAchievements($incharge));
    }

    public function teams(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->teams($incharge));
    }

    public function changelog(Incharge $incharge, InchargeProfileData $profileData): Response
    {
        Gate::authorize('view', $incharge);

        return Inertia::render('incharges/show', $profileData->changelog($incharge));
    }
}
