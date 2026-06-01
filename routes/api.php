<?php

use App\Http\Controllers\Api\V1\AchievementHistoryController;
use App\Http\Controllers\Api\V1\CoachPreviewController;
use App\Http\Controllers\Api\V1\CoachSearchController;
use App\Http\Controllers\Api\V1\CoachTeamsController;
use App\Http\Controllers\Api\V1\MedalsByMemberController;
use App\Http\Controllers\Api\V1\MedalsDetailController;
use App\Http\Controllers\Api\V1\MedalsPivotController;
use App\Http\Controllers\Api\V1\MemberAchievementsController;
use App\Http\Controllers\Api\V1\MemberMediaController;
use App\Http\Controllers\Api\V1\MemberParticipationsController;
use App\Http\Controllers\Api\V1\MemberPreviewController;
use App\Http\Controllers\Api\V1\MemberSearchController;
use App\Http\Controllers\Api\V1\MemberTeamsController;
use App\Http\Controllers\Api\V1\NewJoinersController;
use App\Http\Controllers\Api\V1\PlayerLevelSummaryController;
use App\Http\Controllers\Api\V1\ReferenceDataController;
use App\Http\Controllers\Api\V1\ResignationDismissalController;
use App\Http\Controllers\Api\V1\TeamPreviewController;
use App\Http\Controllers\Api\V1\TeamRosterController;
use App\Http\Controllers\Api\V1\UnitHeadcountController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::middleware(['auth'])->prefix('v1')->name('v1.')->group(function () {
    Route::get('search/members', MemberSearchController::class)->name('search.members');
    Route::get('search/coaches', CoachSearchController::class)->name('search.coaches');
    Route::get('members/{member}/preview', MemberPreviewController::class)->name('members.preview');
    Route::get('members/{member}/teams', MemberTeamsController::class)->name('members.teams.index');
    Route::get('members/{member}/participations', MemberParticipationsController::class)->name('members.participations.index');
    Route::get('members/{member}/achievements', MemberAchievementsController::class)->name('members.achievements.index');
    Route::get('members/{member}/media', MemberMediaController::class)->name('members.media.index');
    Route::get('coaches/{coach}/preview', CoachPreviewController::class)->name('coaches.preview');
    Route::get('coaches/{coach}/teams', CoachTeamsController::class)->name('coaches.teams.index');
    Route::get('teams/{team}/preview', TeamPreviewController::class)->name('teams.preview');
    Route::get('tournament-tiers', [ReferenceDataController::class, 'tournamentTiers'])
        ->name('tournament-tiers.index');
    Route::get('sports', [ReferenceDataController::class, 'sports'])
        ->name('sports.index');
    Route::get('units', [ReferenceDataController::class, 'units'])
        ->name('units.index');
    Route::get('districts', [ReferenceDataController::class, 'districts'])
        ->name('districts.index');
    Route::get('reports/medals', MedalsPivotController::class)->name('reports.medals');
    Route::get('reports/medals/detail', MedalsDetailController::class)->name('reports.medals.detail');
    Route::get('reports/medals-by-member', MedalsByMemberController::class)->name('reports.medals-by-member');
    Route::get('reports/team-roster', TeamRosterController::class)->name('reports.team-roster');
    Route::get('reports/resignation-dismissal-log', ResignationDismissalController::class)->name('reports.resignation-dismissal-log');
    Route::get('reports/unit-headcount', UnitHeadcountController::class)->name('reports.unit-headcount');
    Route::get('reports/player-level-summary', PlayerLevelSummaryController::class)->name('reports.player-level-summary');
    Route::get('reports/new-joiners', NewJoinersController::class)->name('reports.new-joiners');
    Route::get('reports/achievement-history', AchievementHistoryController::class)->name('reports.achievement-history');
});
