<?php

use App\Http\Controllers\Api\V1\CoachSearchController;
use App\Http\Controllers\Api\V1\CoachTeamsController;
use App\Http\Controllers\Api\V1\MedalsByMemberController;
use App\Http\Controllers\Api\V1\MedalsPivotController;
use App\Http\Controllers\Api\V1\MemberAchievementsController;
use App\Http\Controllers\Api\V1\MemberParticipationsController;
use App\Http\Controllers\Api\V1\MemberSearchController;
use App\Http\Controllers\Api\V1\MemberTeamsController;
use App\Http\Controllers\Api\V1\ReferenceDataController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::middleware(['auth'])->prefix('v1')->name('v1.')->group(function () {
    Route::get('search/members', MemberSearchController::class)->name('search.members');
    Route::get('search/coaches', CoachSearchController::class)->name('search.coaches');
    Route::get('members/{member}/teams', MemberTeamsController::class)->name('members.teams.index');
    Route::get('members/{member}/participations', MemberParticipationsController::class)->name('members.participations.index');
    Route::get('members/{member}/achievements', MemberAchievementsController::class)->name('members.achievements.index');
    Route::get('coaches/{coach}/teams', CoachTeamsController::class)->name('coaches.teams.index');
    Route::get('tournament-tiers', [ReferenceDataController::class, 'tournamentTiers'])
        ->name('tournament-tiers.index');
    Route::get('sports', [ReferenceDataController::class, 'sports'])
        ->name('sports.index');
    Route::get('units', [ReferenceDataController::class, 'units'])
        ->name('units.index');
    Route::get('districts', [ReferenceDataController::class, 'districts'])
        ->name('districts.index');
    Route::get('reports/medals', MedalsPivotController::class)->name('reports.medals');
    Route::get('reports/medals-by-member', MedalsByMemberController::class)->name('reports.medals-by-member');
});
