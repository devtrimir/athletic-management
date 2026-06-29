<?php

declare(strict_types=1);

use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
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

function dashboardUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if ($permissions !== []) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $permission = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );

            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $permission->id]);
        }
    }

    return $user;
}

test('dashboard coach count includes only active current-session team assignments', function (): void {
    $user = dashboardUser('coaches.view');
    $currentSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $activeTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => true]);
    $inactiveTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $currentSession->id, 'is_active' => false]);
    $oldSessionTeam = Team::factory()->create(['organization_id' => $user->organization_id, 'session_id' => $oldSession->id, 'is_active' => true]);
    $activeCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $inactiveCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $inactiveTeamCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $oldSessionCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'coach_id' => $activeCoach->id,
        'team_id' => $activeTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => true,
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $inactiveCoach->id,
        'team_id' => $activeTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => false,
        'removed_at' => now(),
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $inactiveTeamCoach->id,
        'team_id' => $inactiveTeam->id,
        'session_id' => $currentSession->id,
        'is_current' => true,
    ]);
    CoachAssignment::factory()->create([
        'coach_id' => $oldSessionCoach->id,
        'team_id' => $oldSessionTeam->id,
        'session_id' => $oldSession->id,
        'is_current' => true,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.coaches.total', 4)
            ->where('stats.coaches.active', 1)
            ->where('stats.coaches.inactive', 3)
        );
});

test('dashboard team count includes active inactive and total teams', function (): void {
    $user = dashboardUser('teams.view');
    $currentSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);

    Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $currentSession->id,
        'is_active' => true,
    ]);
    Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $currentSession->id,
        'is_active' => false,
    ]);
    Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $oldSession->id,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $currentSession->id)
            ->where('stats.teams.total', 2)
            ->where('stats.teams.active', 1)
            ->where('stats.teams.inactive', 1)
            ->where('stats.teams.current_session', 2)
        );

    $this->actingAs($user)
        ->get(route('dashboard', ['session_id' => $oldSession->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $oldSession->id)
            ->where('stats.teams.total', 1)
            ->where('stats.teams.active', 1)
            ->where('stats.teams.inactive', 0)
            ->where('stats.teams.current_session', 1)
        );
});

test('dashboard medal counts are scoped to the current session', function (): void {
    $user = dashboardUser('tournaments.view');
    $currentSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $currentTournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $currentSession->id,
    ]);
    $oldTournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $oldSession->id,
    ]);
    $currentGoldEvent = Event::factory()->forTournament($currentTournament)->create();
    $currentSilverEvent = Event::factory()->forTournament($currentTournament)->create();
    $oldEvent = Event::factory()->forTournament($oldTournament)->create();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);

    $currentGold = Participation::factory()->forEvent($currentGoldEvent)->create([
        'member_id' => $member->id,
        'session_id' => $currentSession->id,
    ]);
    $currentSilver = Participation::factory()->forEvent($currentSilverEvent)->create([
        'member_id' => $member->id,
        'session_id' => $currentSession->id,
    ]);
    $oldBronze = Participation::factory()->forEvent($oldEvent)->create([
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
    ]);

    Achievement::factory()->forParticipation($currentGold)->create(['medal_type' => 'GOLD']);
    Achievement::factory()->forParticipation($currentSilver)->create(['medal_type' => 'SILVER']);
    Achievement::factory()->forParticipation($oldBronze)->create(['medal_type' => 'BRONZE']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $currentSession->id)
            ->where('stats.medals.gold', 1)
            ->where('stats.medals.silver', 1)
            ->where('stats.medals.bronze', 0)
            ->where('stats.medals.total', 2)
        );

    $this->actingAs($user)
        ->get(route('dashboard', ['session_id' => $oldSession->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $oldSession->id)
            ->where('stats.medals.gold', 0)
            ->where('stats.medals.silver', 0)
            ->where('stats.medals.bronze', 1)
            ->where('stats.medals.total', 1)
        );
});

test('dashboard medal counts fall back to all time when no current session exists', function (): void {
    $user = dashboardUser('tournaments.view');
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id, 'is_current' => false]);
    $tournament = Tournament::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
    ]);
    $event = Event::factory()->forTournament($tournament)->create();
    $member = Member::factory()->create(['organization_id' => $user->organization_id]);
    $participation = Participation::factory()->forEvent($event)->create([
        'member_id' => $member->id,
        'session_id' => $session->id,
    ]);

    Achievement::factory()->forParticipation($participation)->create(['medal_type' => 'BRONZE']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession', null)
            ->where('stats.medals.gold', 0)
            ->where('stats.medals.silver', 0)
            ->where('stats.medals.bronze', 1)
            ->where('stats.medals.total', 1)
        );
});
