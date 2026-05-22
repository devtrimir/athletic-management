<?php

use App\Http\Controllers\Settings\DistrictController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\SportController;
use App\Http\Controllers\Settings\SportSessionController;
use App\Http\Controllers\Settings\UnitController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('settings/sessions', SportSessionController::class)
        ->except(['show'])
        ->names('sessions');

    Route::resource('settings/sports', SportController::class)
        ->except(['show'])
        ->names('sports');

    Route::resource('settings/units', UnitController::class)
        ->except(['show'])
        ->names('units');

    Route::resource('settings/districts', DistrictController::class)
        ->except(['show'])
        ->names('districts');
});
