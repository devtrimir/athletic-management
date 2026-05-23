<?php

use App\Http\Controllers\Api\V1\MemberSearchController;
use App\Http\Controllers\Api\V1\ReferenceDataController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::middleware(['auth'])->prefix('v1')->name('v1.')->group(function () {
    Route::get('search/members', MemberSearchController::class)->name('search.members');
    Route::get('tournament-tiers', [ReferenceDataController::class, 'tournamentTiers'])
        ->name('tournament-tiers.index');
    Route::get('sports', [ReferenceDataController::class, 'sports'])
        ->name('sports.index');
    Route::get('units', [ReferenceDataController::class, 'units'])
        ->name('units.index');
    Route::get('districts', [ReferenceDataController::class, 'districts'])
        ->name('districts.index');
});
