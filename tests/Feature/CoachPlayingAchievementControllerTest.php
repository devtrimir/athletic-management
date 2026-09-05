<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachPlayingAchievement;
use App\Models\CoachSpecialAchievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
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
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'National Police Games',
            'level' => 'NATIONAL',
            'event_date' => '2010-02-15',
            'sport_id' => $sport->id,
        ])
        ->assertForbidden();
});

test('user with coaches.managePlayingAchievements can store a record', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'period' => 'PRE_RECRUITMENT',
            'level' => 'NATIONAL',
            'competition_details' => '100m sprint gold medal',
            'event_date' => '2010-02-15',
            'venue' => 'Lucknow',
            'sport_id' => $sport->id,
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
        ->and($record->sport_id)->toBe($sport->id)
        ->and($record->organization_id)->toBe($coach->organization_id);
});

test('user with coaches.update can store a record without the dedicated permission', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.update');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'State Championship',
            'level' => 'STATE',
            'event_date' => '2012-05-10',
            'sport_id' => $sport->id,
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
        ->assertSessionHasErrors(['title', 'level', 'period', 'medal_type', 'position', 'event_date', 'sport_id']);

    expect(CoachPlayingAchievement::query()->where('coach_id', $coach->id)->exists())->toBeFalse();
});

test('store rejects a malformed event_date or achieved_on', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->from(route('coaches.achievements', $coach))
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'level' => 'NATIONAL',
            'event_date' => '15/02/2010',
            'sport_id' => $sport->id,
        ])
        ->assertSessionHasErrors(['event_date']);

    $this->actingAs($user)
        ->from(route('coaches.achievements', $coach))
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'level' => 'NATIONAL',
            'event_date' => '2010-02-15',
            'achieved_on' => 'not-a-date',
            'sport_id' => $sport->id,
        ])
        ->assertSessionHasErrors(['achieved_on']);

    expect(CoachPlayingAchievement::query()->where('coach_id', $coach->id)->exists())->toBeFalse();
});

test('store rejects a sport belonging to another organization', function (): void {
    $user = coachPlayingAchievementUser('coaches.view', 'coaches.managePlayingAchievements');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherOrg = Organization::factory()->create();
    $foreignSport = Sport::factory()->create(['organization_id' => $otherOrg->id]);

    $this->actingAs($user)
        ->from(route('coaches.achievements', $coach))
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'level' => 'NATIONAL',
            'event_date' => '2010-02-15',
            'sport_id' => $foreignSport->id,
        ])
        ->assertSessionHasErrors(['sport_id']);

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
    $sport = Sport::factory()->create(['organization_id' => $user->organization_id]);

    $achievementsBefore = Achievement::count();

    $this->actingAs($user)
        ->post(route('coaches.playing-achievements.store', $coach), [
            'title' => 'All India Police Sports Meet',
            'level' => 'NATIONAL',
            'medal_type' => 'GOLD',
            'event_date' => '2010-02-15',
            'sport_id' => $sport->id,
        ])
        ->assertRedirect(route('coaches.achievements', $coach));

    expect(Achievement::count())->toBe($achievementsBefore)
        ->and(CoachPlayingAchievement::where('coach_id', $coach->id)->count())->toBe(1);
});

test('achievements tab exposes playing achievements separate from coached achievements', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $sport = Sport::factory()->create(['organization_id' => $coach->organization_id]);

    CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'National Police Games',
        'level' => 'NATIONAL',
        'medal_type' => 'GOLD',
        'event_date' => '2010-02-15',
        'sport_id' => $sport->id,
    ]);

    $sportName = $sport->name;

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('activeTab', 'achievements')
            ->has('coachAchievements.summary')
            ->where('playingAchievements.source', 'legacy')
            ->where('playingAchievements.linked_member', null)
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.title', 'National Police Games')
            ->where('playingAchievements.records.0.medal_type', 'GOLD')
            ->where('playingAchievements.records.0.sport.name', $sportName)
            ->has('playingAchievements.sports')
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
            ->where('playingAchievements.source', 'legacy')
            ->where('playingAchievements.linked_member', null)
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.title', 'National Police Games')
            ->where('playingAchievements.records.0.medal_type', 'GOLD')
            ->has('coachAchievements.summary')
        );
});

/**
 * Build a tournament → event → participation → achievement chain for a member.
 *
 * @return array{tournament: Tournament, event: Event, achievement: Achievement}
 */
function memberPlayingAchievement(Member $member, array $eventState = [], array $achievementState = []): array
{
    $tournament = Tournament::factory()->create([
        'organization_id' => $member->organization_id,
        'session_id' => SportSession::factory()->create(['organization_id' => $member->organization_id])->id,
        'name' => 'All India Police Sports Meet',
        'date_from' => '2019-02-10',
        'date_to' => '2019-02-15',
        'venue' => 'Lucknow',
    ]);

    $event = Event::factory()->forTournament($tournament)->create([
        'name' => '100m Sprint',
        'event_type' => 'individual',
        ...$eventState,
    ]);

    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => null,
    ]);

    $achievement = Achievement::factory()->forParticipation($participation)->create($achievementState);

    return ['tournament' => $tournament, 'event' => $event, 'achievement' => $achievement];
}

test('linked coach derives playing achievements from the member record', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
    ]);

    memberPlayingAchievement($member, [], ['medal_type' => 'GOLD', 'position' => 1]);

    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    $teamTournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
        'name' => 'National Police Games',
        'date_from' => '2021-03-01',
    ]);
    $teamEvent = Event::factory()->forTournament($teamTournament)->create([
        'name' => 'Basketball Team',
        'event_type' => 'team',
    ]);
    $teamParticipation = Participation::factory()->forEvent($teamEvent)->create([
        'member_id' => $member->id,
        'team_id' => $team->id,
    ]);
    Achievement::factory()->forParticipation($teamParticipation)->create(['medal_type' => 'SILVER', 'position' => 2]);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/show')
            ->where('playingAchievements.source', 'member')
            ->where('playingAchievements.linked_member.id', $member->id)
            ->where('playingAchievements.linked_member.member_code', $member->member_code)
            ->has('playingAchievements.records', 2)
            ->where('playingAchievements.records.0.event_kind', 'team')
            ->where('playingAchievements.records.0.medal_type', 'SILVER')
            ->where('playingAchievements.records.0.tournament.name', 'National Police Games')
            ->where('playingAchievements.records.0.event.name', 'Basketball Team')
            ->where('playingAchievements.records.0.achieved_on', '2021-03-01')
            ->where('playingAchievements.records.1.event_kind', 'individual')
            ->where('playingAchievements.records.1.medal_type', 'GOLD')
            ->where('playingAchievements.records.1.tournament.name', 'All India Police Sports Meet')
            ->where('playingAchievements.records.1.tournament.tier_code', 'NATIONAL')
            ->where('playingAchievements.records.1.achieved_on', '2019-02-10')
            ->where('playingAchievements.summary.total', 2)
            ->where('playingAchievements.summary.medals', 2)
            ->has('playingAchievements.sports')
            ->where('coach.member_id', $member->id)
            ->where('coach.linked_member.id', $member->id)
            ->where('coachAchievements.summary.GOLD', 0)
            ->where('coachAchievements.summary.total_events', 0)
            ->has('coachAchievements.groups', 0)
        );
});

test('legacy free-form records are hidden for a linked coach', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
    ]);

    CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'Legacy State Championship',
    ]);

    memberPlayingAchievement($member, [], ['medal_type' => 'BRONZE']);

    $this->actingAs($user)
        ->get(route('coaches.achievements', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('playingAchievements.source', 'member')
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.medal_type', 'BRONZE')
            ->where('playingAchievements.summary.total', 1)
        );

    expect(CoachPlayingAchievement::where('coach_id', $coach->id)->count())->toBe(1);
});

test('linked coach print preview renders the member-derived playing achievements', function (): void {
    $user = coachPlayingAchievementUser('coaches.view');
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
    ]);

    memberPlayingAchievement($member, [], ['medal_type' => 'GOLD', 'position' => 1]);

    $this->actingAs($user)
        ->get(route('coaches.preview', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coaches/print-preview')
            ->where('playingAchievements.source', 'member')
            ->where('playingAchievements.linked_member.id', $member->id)
            ->has('playingAchievements.records', 1)
            ->where('playingAchievements.records.0.event_kind', 'individual')
            ->where('playingAchievements.records.0.tournament.name', 'All India Police Sports Meet')
            ->where('playingAchievements.records.0.event.name', '100m Sprint')
            ->has('coachAchievements.summary')
        );
});
