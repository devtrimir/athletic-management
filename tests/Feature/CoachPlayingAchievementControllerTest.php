<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachPlayingAchievement;
use App\Models\CoachSpecialAchievement;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coachPlayingAchievementUser(string ...$permissions)
{
    $user = rcUser(...$permissions);
    $user->update(['email_verified_at' => now()]);

    return $user;
}

test('unauthenticated user is redirected', function (): void {
    $coach = Coach::factory()->create();

    $this->post(route('coaches.playing-achievements.store', $coach), [
        'title' => 'National Police Games',
        'level' => 'NATIONAL',
    ])->assertRedirect(route('login'));
});

test('user without coaches.managePlayingAchievements cannot store', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'National Police Games',
            'level' => 'NATIONAL',
        ])
        ->assertForbidden();
});

test('user with coaches.managePlayingAchievements can store a record', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'period' => 'PRE_RECRUITMENT',
            'level' => 'NATIONAL',
            'competition_details' => '100m sprint gold medal',
            'event_date' => '2010-02-15',
            'venue' => 'Lucknow',
            'sport_discipline' => 'Athletics',
            'event' => '100m Sprint',
            'medal_type' => 'GOLD',
            'position' => 1,
            'achieved_on' => '2010-02-15',
            'remarks' => 'Personal best.',
        ])
        ->assertRedirect(route('coaches.achievements', $coach));

    $record = CoachPlayingAchievement::where('coach_id', $coach->id)->firstOrFail();

    expect($record->title)->toBe('All India Police Sports Meet')
        ->and($record->level)->toBe('NATIONAL')
        ->and($record->medal_type)->toBe('GOLD')
        ->and($record->organization_id)->toBe($coach->organization_id);
});

test('user with coaches.update can store a record without the dedicated permission', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.update');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'State Championship',
            'level' => 'STATE',
        ])
        ->assertRedirect(route('coaches.achievements', $coach));

    expect(CoachPlayingAchievement::where('coach_id', $coach->id)->exists())->toBeTrue();
});

test('store validates required fields and allowed values', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.achievements', $coach))
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => '',
            'level' => 'NOT_A_LEVEL',
            'period' => 'SOMETIME',
            'medal_type' => 'PLATINUM',
            'position' => 0,
        ])
        ->assertRedirect(route('coaches.achievements', $coach))
        ->assertSessionHasErrors(['title', 'level', 'period', 'medal_type', 'position']);

    expect(CoachPlayingAchievement::query()->where('coach_id', $coach->id)->exists())->toBeFalse();
});

test('update requires coaches.managePlayingAchievements', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->patch(route('coaches.playing-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertForbidden();
});

test('update modifies the record and redirects', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'Original',
    ]);

    $this->actingAs($user)
        ->patch(route('coaches.playing-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated Title',
            'medal_type' => 'SILVER',
            'achieved_on' => '2015-01-15',
        ])
        ->assertRedirect(route('coaches.achievements', $coach));

    expect($achievement->fresh()->title)->toBe('Updated Title')
        ->and($achievement->fresh()->medal_type)->toBe('SILVER');
});

test('update returns 404 for achievement belonging to another coach', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($otherCoach)->create();

    $this->actingAs($user)
        ->patch(route('coaches.playing-achievements.update', [$coach, $achievement]), [
            'title' => 'Updated',
        ])
        ->assertNotFound();
});

test('destroy returns 404 for achievement belonging to another coach', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($otherCoach)->create();

    $this->actingAs($user)
        ->delete(route('coaches.playing-achievements.destroy', [$coach, $achievement]))
        ->assertNotFound();

    expect(CoachPlayingAchievement::find($achievement->id))->not->toBeNull();
});

test('destroy requires coaches.managePlayingAchievements', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->delete(route('coaches.playing-achievements.destroy', [$coach, $achievement]))
        ->assertForbidden();
});

test('destroy removes the record and redirects', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $achievement = CoachPlayingAchievement::factory()->forCoach($coach)->create();

    $this->actingAs($user)
        ->delete(route('coaches.playing-achievements.destroy', [$coach, $achievement]))
        ->assertRedirect(route('coaches.achievements', $coach));

    expect(CoachPlayingAchievement::find($achievement->id))->toBeNull();
});

test('coach from another organization returns 404', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $otherOrg = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'Test',
            'level' => 'NATIONAL',
        ])
        ->assertNotFound();
});

test('storing a playing achievement does not touch the achievements medal tally tables', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $achievementsBefore = Achievement::count();

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'level' => 'NATIONAL',
            'medal_type' => 'GOLD',
            'event_date' => '2010-02-15',
        ])
        ->assertRedirect(route('coaches.achievements', $coach));

    expect(Achievement::count())->toBe($achievementsBefore)
        ->and(CoachPlayingAchievement::where('coach_id', $coach->id)->count())->toBe(1);
});

test('achievements tab exposes playing achievements separate from coached achievements', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'National Police Games',
        'level' => 'NATIONAL',
        'medal_type' => 'GOLD',
        'event_date' => '2010-02-15',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'achievements')
            ->has('coachAchievements.summary')
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.title', 'National Police Games')
            ->where('playingAchievements.records.0.medal_type', 'GOLD')
            ->where('playingAchievements.summary.total', 1)
            ->where('playingAchievements.summary.medals', 1)
            ->missing('rewardEvidenceOptions')
            ->missing('auditLog')
        );
});

test('coach print preview includes special achievements and playing achievements payloads', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'National Police Games',
        'level' => 'NATIONAL',
        'medal_type' => 'GOLD',
        'event_date' => '2010-02-15',
    ]);

    CoachSpecialAchievement::factory()->forCoach($coach)->create([
        'title' => 'Commendation Disc',
        'awarded_on' => '2020-01-10',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.preview', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/print-preview')
            ->has('specialAchievements.records', 1)
            ->where('specialAchievements.records.0.title', 'Commendation Disc')
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.title', 'National Police Games')
            ->where('playingAchievements.records.0.medal_type', 'GOLD')
            ->has('coachAchievements.summary')
        );
});
