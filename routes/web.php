<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MemberController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('members', MemberController::class);
});

require __DIR__.'/settings.php';
