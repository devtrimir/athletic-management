<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberStatusController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('members', MemberController::class);
    Route::post('members/{member}/status', [MemberStatusController::class, 'store'])->name('members.status.store');
});

require __DIR__.'/settings.php';
