<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Support\Tournaments\TournamentProfileData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TournamentProfileTabController extends Controller
{
    public function events(Tournament $tournament, Request $request, TournamentProfileData $profileData): Response
    {
        Gate::authorize('view', $tournament);

        return Inertia::render('tournaments/show', $profileData->events($tournament, $request->query('filter', [])));
    }
}
