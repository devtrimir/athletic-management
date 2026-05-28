<?php

use App\Http\Controllers\AchievementBenefitController;
use App\Http\Controllers\CoachController;
use App\Http\Controllers\CoachExportController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventParticipantController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MemberAliasController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberExportController;
use App\Http\Controllers\MemberLegacyAchievementController;
use App\Http\Controllers\MemberPhotoController;
use App\Http\Controllers\MemberStatusController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportsMedalsController;
use App\Http\Controllers\TeamCoachController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamExportController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\TournamentExportController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('members/export', [MemberExportController::class, 'index'])->name('members.export');
    Route::resource('members', MemberController::class);
    Route::get('members/{member}/export', [MemberExportController::class, 'show'])->name('members.export.show');
    Route::get('coaches/export', [CoachExportController::class, 'index'])->name('coaches.export');
    Route::resource('coaches', CoachController::class);
    Route::get('coaches/{coach}/export', [CoachExportController::class, 'show'])->name('coaches.export.show');
    Route::get('teams/export', [TeamExportController::class, 'index'])->name('teams.export');
    Route::resource('teams', TeamController::class);
    Route::get('tournaments/export', [TournamentExportController::class, 'index'])->name('tournaments.export');
    Route::resource('tournaments', TournamentController::class);
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/medals', ReportsMedalsController::class)->name('reports.medals');
    Route::get('reports/{key}/export', [ReportController::class, 'export'])->name('reports.export');
    Route::get('reports/{key}', [ReportController::class, 'show'])->name('reports.show');
    Route::post('tournaments/{tournament}/events', [EventController::class, 'store'])
        ->name('tournaments.events.store')->scopeBindings();
    Route::get('tournaments/{tournament}/events/{event}', [EventController::class, 'show'])
        ->name('tournaments.events.show')->scopeBindings();
    Route::patch('tournaments/{tournament}/events/{event}', [EventController::class, 'update'])
        ->name('tournaments.events.update')->scopeBindings();
    Route::delete('tournaments/{tournament}/events/{event}', [EventController::class, 'destroy'])
        ->name('tournaments.events.destroy')->scopeBindings();
    Route::post('tournaments/{tournament}/events/{event}/participants', [EventParticipantController::class, 'store'])
        ->name('tournaments.events.participants.store')->scopeBindings();
    Route::patch('tournaments/{tournament}/events/{event}/participants/{participation}', [EventParticipantController::class, 'update'])
        ->name('tournaments.events.participants.update')->scopeBindings();
    Route::delete('tournaments/{tournament}/events/{event}/participants/{participation}', [EventParticipantController::class, 'destroy'])
        ->name('tournaments.events.participants.destroy')->scopeBindings();
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('teams/{team}/members/{member}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
    Route::post('teams/{team}/coaches', [TeamCoachController::class, 'store'])->name('teams.coaches.store');
    Route::delete('teams/{team}/coaches/{coach}', [TeamCoachController::class, 'destroy'])->name('teams.coaches.destroy');
    Route::post('members/{member}/status', [MemberStatusController::class, 'store'])->name('members.status.store');
    Route::post('members/{member}/aliases', [MemberAliasController::class, 'store'])->name('members.aliases.store');
    Route::delete('members/{member}/aliases/{alias}', [MemberAliasController::class, 'destroy'])->name('members.aliases.destroy');
    Route::post('members/{member}/photo', [MemberPhotoController::class, 'store'])->name('members.photo.store');
    Route::delete('members/{member}/photo', [MemberPhotoController::class, 'destroy'])->name('members.photo.destroy');
    Route::post('members/{member}/legacy-achievements', [MemberLegacyAchievementController::class, 'store'])->name('members.legacy-achievements.store');
    Route::patch('members/{member}/legacy-achievements/{legacyAchievement}', [MemberLegacyAchievementController::class, 'update'])->name('members.legacy-achievements.update');
    Route::delete('members/{member}/legacy-achievements/{legacyAchievement}', [MemberLegacyAchievementController::class, 'destroy'])->name('members.legacy-achievements.destroy');
    Route::post('achievement-benefits', [AchievementBenefitController::class, 'store'])->name('achievement-benefits.store');
    Route::patch('achievement-benefits/{benefit}', [AchievementBenefitController::class, 'update'])->name('achievement-benefits.update');
    Route::delete('achievement-benefits/{benefit}', [AchievementBenefitController::class, 'destroy'])->name('achievement-benefits.destroy');
});

require __DIR__.'/settings.php';
