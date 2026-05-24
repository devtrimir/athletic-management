<?php

use App\Http\Controllers\CoachController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MemberAliasController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberStatusController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('members', MemberController::class);
    Route::resource('coaches', CoachController::class);
    Route::post('members/{member}/status', [MemberStatusController::class, 'store'])->name('members.status.store');
    Route::post('members/{member}/aliases', [MemberAliasController::class, 'store'])->name('members.aliases.store');
    Route::delete('members/{member}/aliases/{alias}', [MemberAliasController::class, 'destroy'])->name('members.aliases.destroy');
});

require __DIR__.'/settings.php';
