<?php

use App\Http\Controllers\AchievementBenefitController;
use App\Http\Controllers\Api\V1\MemberAuditLogController;
use App\Http\Controllers\CoachAliasController;
use App\Http\Controllers\CoachController;
use App\Http\Controllers\CoachExportController;
use App\Http\Controllers\CoachPhotoController;
use App\Http\Controllers\CoachStatusController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventParticipantController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MedalsExportController;
use App\Http\Controllers\MediaFileController;
use App\Http\Controllers\MemberAliasController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberExportController;
use App\Http\Controllers\MemberLegacyAchievementController;
use App\Http\Controllers\MemberPhotoController;
use App\Http\Controllers\MemberProfileTabController;
use App\Http\Controllers\MemberPromotionController;
use App\Http\Controllers\MemberSpecialAchievementController;
use App\Http\Controllers\MemberStatusController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportsMedalsController;
use App\Http\Controllers\TeamCloneController;
use App\Http\Controllers\TeamCoachController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamExportController;
use App\Http\Controllers\TeamInchargeController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\TournamentExportController;
use Illuminate\Support\Facades\Route;

Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('members/export', [MemberExportController::class, 'index'])->name('members.export');
    Route::resource('members', MemberController::class);
    Route::get('members/{member}/teams', [MemberProfileTabController::class, 'teams'])->name('members.teams');
    Route::get('members/{member}/events', [MemberProfileTabController::class, 'events'])->name('members.events');
    Route::get('members/{member}/performance', [MemberProfileTabController::class, 'performance'])->name('members.performance');
    Route::get('members/{member}/special-achievements', [MemberProfileTabController::class, 'specialAchievements'])->name('members.special-achievements');
    Route::get('members/{member}/promotions', [MemberProfileTabController::class, 'promotions'])->name('members.promotions');
    Route::get('members/{member}/changelog', [MemberProfileTabController::class, 'changelog'])->name('members.changelog');
    Route::get('members/{member}/media', [MemberProfileTabController::class, 'media'])->name('members.media');
    Route::get('members/{member}/status', [MemberProfileTabController::class, 'status'])->name('members.status');
    Route::get('members/{member}/preview', [MemberController::class, 'preview'])->name('members.preview');
    Route::get('members/{member}/export', [MemberExportController::class, 'show'])->name('members.export.show');
    Route::get('coaches/export', [CoachExportController::class, 'index'])->name('coaches.export');
    Route::resource('coaches', CoachController::class);
    Route::get('coaches/{coach}/export', [CoachExportController::class, 'show'])->name('coaches.export.show');
    Route::post('coaches/{coach}/status', [CoachStatusController::class, 'store'])->name('coaches.status.store');
    Route::post('coaches/{coach}/aliases', [CoachAliasController::class, 'store'])->name('coaches.aliases.store');
    Route::delete('coaches/{coach}/aliases/{alias}', [CoachAliasController::class, 'destroy'])->name('coaches.aliases.destroy');
    Route::post('coaches/{coach}/photo', [CoachPhotoController::class, 'store'])->name('coaches.photo.store');
    Route::delete('coaches/{coach}/photo', [CoachPhotoController::class, 'destroy'])->name('coaches.photo.destroy');
    Route::get('teams/export', [TeamExportController::class, 'index'])->name('teams.export');
    Route::resource('teams', TeamController::class);
    Route::get('tournaments/export', [TournamentExportController::class, 'index'])->name('tournaments.export');
    Route::resource('tournaments', TournamentController::class);
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/medals', ReportsMedalsController::class)->name('reports.medals');
    Route::get('reports/medals/export', MedalsExportController::class)->name('reports.medals.export');
    Route::get('reports/{key}/members/{member}/performance', [ReportController::class, 'memberPerformanceDetail'])->name('reports.member-performance-detail');
    Route::get('reports/{key}/drilldown', [ReportController::class, 'playerPerformanceDrilldown'])->name('reports.player-performance-drilldown');
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
    Route::post('teams/{team}/members/backfill/preview', [TeamMemberController::class, 'previewBackfill'])->name('teams.members.backfill.preview');
    Route::post('teams/{team}/members/backfill', [TeamMemberController::class, 'backfill'])->name('teams.members.backfill');
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('teams/{team}/members/bulk', [TeamMemberController::class, 'bulkDestroy'])->name('teams.members.bulkDestroy');
    Route::patch('teams/{team}/memberships/{teamMember}', [TeamMemberController::class, 'update'])->name('teams.members.update');
    Route::delete('teams/{team}/members/{member}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
    Route::post('teams/{team}/coaches', [TeamCoachController::class, 'store'])->name('teams.coaches.store');
    Route::delete('teams/{team}/coaches/bulk', [TeamCoachController::class, 'bulkDestroy'])->name('teams.coaches.bulkDestroy');
    Route::delete('teams/{team}/coaches/{coach}', [TeamCoachController::class, 'destroy'])->name('teams.coaches.destroy');
    Route::post('teams/{team}/incharge', [TeamInchargeController::class, 'store'])->name('teams.incharge.store');
    Route::patch('teams/{team}/incharge', [TeamInchargeController::class, 'update'])->name('teams.incharge.update');
    Route::delete('teams/{team}/incharge', [TeamInchargeController::class, 'destroy'])->name('teams.incharge.destroy');
    Route::post('teams/{team}/clone', TeamCloneController::class)->name('teams.clone');
    Route::post('members/{member}/status', [MemberStatusController::class, 'store'])->name('members.status.store');
    Route::post('members/{member}/aliases', [MemberAliasController::class, 'store'])->name('members.aliases.store');
    Route::delete('members/{member}/aliases/{alias}', [MemberAliasController::class, 'destroy'])->name('members.aliases.destroy');
    Route::post('members/{member}/photo', [MemberPhotoController::class, 'store'])->name('members.photo.store');
    Route::delete('members/{member}/photo', [MemberPhotoController::class, 'destroy'])->name('members.photo.destroy');
    Route::post('members/{member}/legacy-achievements', [MemberLegacyAchievementController::class, 'store'])->name('members.legacy-achievements.store');
    Route::patch('members/{member}/legacy-achievements/{legacyAchievement}', [MemberLegacyAchievementController::class, 'update'])->name('members.legacy-achievements.update');
    Route::delete('members/{member}/legacy-achievements/{legacyAchievement}', [MemberLegacyAchievementController::class, 'destroy'])->name('members.legacy-achievements.destroy');
    Route::post('members/{member}/special-achievements', [MemberSpecialAchievementController::class, 'store'])->name('members.special-achievements.store');
    Route::patch('members/{member}/special-achievements/{specialAchievement}', [MemberSpecialAchievementController::class, 'update'])->name('members.special-achievements.update');
    Route::delete('members/{member}/special-achievements/{specialAchievement}', [MemberSpecialAchievementController::class, 'destroy'])->name('members.special-achievements.destroy');
    Route::get('members/{member}/special-achievements/{specialAchievement}/order-document', [MemberSpecialAchievementController::class, 'orderDocument'])->name('members.special-achievements.order-document');
    Route::get('members/{member}/special-achievements/{specialAchievement}/order-document/preview', [MemberSpecialAchievementController::class, 'previewOrderDocument'])->name('members.special-achievements.order-document.preview');
    Route::post('members/{member}/promotions', [MemberPromotionController::class, 'store'])->name('members.promotions.store');
    Route::patch('members/{member}/promotions/{promotion}', [MemberPromotionController::class, 'update'])->name('members.promotions.update');
    Route::delete('members/{member}/promotions/{promotion}', [MemberPromotionController::class, 'destroy'])->name('members.promotions.destroy');
    Route::get('members/{member}/audit-log', MemberAuditLogController::class)->name('members.audit-log.index');
    Route::post('achievement-benefits', [AchievementBenefitController::class, 'store'])->name('achievement-benefits.store');
    Route::patch('achievement-benefits/{benefit}', [AchievementBenefitController::class, 'update'])->name('achievement-benefits.update');
    Route::delete('achievement-benefits/{benefit}', [AchievementBenefitController::class, 'destroy'])->name('achievement-benefits.destroy');
    Route::get('participations/{participation}/media', [MediaFileController::class, 'index'])->name('participations.media.index');
    Route::post('participations/{participation}/media', [MediaFileController::class, 'store'])->name('participations.media.store');
    Route::delete('participations/{participation}/media/{mediaFile}', [MediaFileController::class, 'destroy'])->name('participations.media.destroy');
    Route::get('members/{member}/promotions/{promotion}/media', [MediaFileController::class, 'indexPromotion'])->name('members.promotions.media.index');
    Route::post('members/{member}/promotions/{promotion}/media', [MediaFileController::class, 'storePromotion'])->name('members.promotions.media.store');
    Route::delete('members/{member}/promotions/{promotion}/media/{mediaFile}', [MediaFileController::class, 'destroyPromotion'])->name('members.promotions.media.destroy');
});

require __DIR__.'/settings.php';
