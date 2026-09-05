<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPlayingAchievement;
use App\Models\CoachSpecialAchievement;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Participation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function coachPreviewUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'coaches.view'],
        ['group' => 'coaches', 'name_hi' => 'coaches.view', 'name_en' => 'coaches.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

test('unauthenticated user cannot access coach preview', function () {
    $coach = Coach::factory()->create();

    $this->getJson(route('v1.coaches.preview', $coach))
        ->assertUnauthorized();
});

test('user without permission cannot access coach preview', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $coach = Coach::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertForbidden();
});

test('authorized user can view coach preview', function () {
    $user = coachPreviewUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertOk()
        ->assertJsonStructure(['id', 'full_name', 'mobile', 'team_activity_status'])
        ->assertJsonPath('team_activity_status', 'inactive');
});

test('coach preview marks active only with current active team assignment', function () {
    $user = coachPreviewUser();
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $team = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $session->id, 'is_active' => true]);
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $coach->id,
        'team_id' => $team->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertOk()
        ->assertJsonPath('team_activity_status', 'active');
});

test('user cannot preview coach from another organization', function () {
    $user = coachPreviewUser();
    $other = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertNotFound();
});

test('coach preview includes special achievements and playing achievements', function () {
    $user = coachPreviewUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachSpecialAchievement::factory()->forCoach($coach)->create([
        'title' => 'Commendation Disc',
        'awarded_on' => '2020-01-10',
    ]);

    CoachPlayingAchievement::factory()->forCoach($coach)->create([
        'title' => 'National Police Games',
        'level' => 'NATIONAL',
        'medal_type' => 'GOLD',
        'event_type' => 'team',
        'event_date' => '2010-02-15',
    ]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertOk()
        ->assertJsonPath('special_achievements.0.title', 'Commendation Disc')
        ->assertJsonPath('playing_achievements_source', 'legacy')
        ->assertJsonPath('linked_member', null)
        ->assertJsonPath('playing_achievements.0.title', 'National Police Games')
        ->assertJsonPath('playing_achievements.0.medal_type', 'GOLD')
        ->assertJsonPath('playing_achievements.0.level', 'NATIONAL')
        ->assertJsonPath('playing_achievements.0.event_type', 'team')
        ->assertJsonPath('playing_achievements.0.source_achievement_id', null)
        ->assertJsonStructure([
            'special_achievements' => [
                '*' => ['id', 'achievement_type', 'title', 'awarded_on', 'issuing_authority', 'place', 'remarks'],
            ],
            'playing_achievements' => [
                '*' => [
                    'id', 'title', 'period', 'level', 'competition_details', 'event_date',
                    'venue', 'sport_id', 'sport', 'event', 'medal_type', 'event_type',
                    'source_achievement_id', 'position', 'achieved_on', 'remarks',
                ],
            ],
        ]);
});

test('coach preview derives playing achievements from the linked member', function () {
    $user = coachPreviewUser();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $coach = Coach::factory()->create([
        'organization_id' => $user->organization_id,
        'member_id' => $member->id,
    ]);

    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => SportSession::factory()->create(['organization_id' => $user->organization_id])->id,
        'name' => 'All India Police Sports Meet',
        'date_from' => '2019-02-10',
    ]);
    $event = Event::factory()->forTournament($tournament)->create([
        'name' => '100m Sprint',
        'event_type' => 'individual',
    ]);
    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'team_id' => null,
    ]);
    Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'GOLD', 'position' => 1]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertOk()
        ->assertJsonPath('playing_achievements_source', 'member')
        ->assertJsonPath('linked_member.id', $member->id)
        ->assertJsonPath('linked_member.member_code', $member->member_code)
        ->assertJsonPath('playing_achievements.0.medal_type', 'GOLD')
        ->assertJsonPath('playing_achievements.0.event_kind', 'individual')
        ->assertJsonPath('playing_achievements.0.tournament_name', 'All India Police Sports Meet')
        ->assertJsonPath('playing_achievements.0.event_name', '100m Sprint')
        ->assertJsonPath('playing_achievements.0.achieved_on', '2019-02-10')
        ->assertJsonMissingPath('playing_achievements.0.title');
});
