<?php

use App\Http\Controllers\CoachController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventParticipantController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MemberAliasController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberStatusController;
use App\Http\Controllers\TeamCoachController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TournamentController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('members', MemberController::class);
    Route::resource('coaches', CoachController::class);
    Route::resource('teams', TeamController::class);
    Route::resource('tournaments', TournamentController::class);
    Route::post('tournaments/{tournament}/events', [EventController::class, 'store'])
        ->name('tournaments.events.store')->scopeBindings();
    Route::get('tournaments/{tournament}/events/{event}', [EventController::class, 'show'])
        ->name('tournaments.events.show')->scopeBindings();
    Route::post('tournaments/{tournament}/events/{event}/participants', [EventParticipantController::class, 'store'])
        ->name('tournaments.events.participants.store')->scopeBindings();
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('teams/{team}/members/{member}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
    Route::post('teams/{team}/coaches', [TeamCoachController::class, 'store'])->name('teams.coaches.store');
    Route::delete('teams/{team}/coaches/{coach}', [TeamCoachController::class, 'destroy'])->name('teams.coaches.destroy');
    Route::post('members/{member}/status', [MemberStatusController::class, 'store'])->name('members.status.store');
    Route::post('members/{member}/aliases', [MemberAliasController::class, 'store'])->name('members.aliases.store');
    Route::delete('members/{member}/aliases/{alias}', [MemberAliasController::class, 'destroy'])->name('members.aliases.destroy');
});

require __DIR__.'/settings.php';
