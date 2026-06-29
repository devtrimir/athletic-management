<?php

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function dashboardMemberUser(Organization $org): User
{
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
    ]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );

    DB::table('role_permission')->insert([
        'role_id' => $role->id,
        'permission_id' => $perm->id,
    ]);

    return $user;
}

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard shows member status totals and active chart data', function () {
    $org = Organization::factory()->create();
    $user = dashboardMemberUser($org);
    $currentSession = SportSession::factory()->create(['organization_id' => $org->id, 'is_current' => true]);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id, 'is_current' => false]);
    $activeTeam = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $currentSession->id,
        'is_active' => true,
    ]);
    $inactiveTeam = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $currentSession->id,
        'is_active' => false,
    ]);
    $oldSessionTeam = Team::factory()->create([
        'organization_id' => $org->id,
        'session_id' => $oldSession->id,
        'is_active' => true,
    ]);

    $activeRosterMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    $inactiveTeamMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    $oldSessionMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    $removedRosterMember = Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $org->id,
        'current_status' => 'RETIRED',
    ]);

    TeamMember::factory()->create([
        'team_id' => $activeTeam->id,
        'member_id' => $activeRosterMember->id,
        'session_id' => $currentSession->id,
        'left_on' => null,
    ]);
    TeamMember::factory()->create([
        'team_id' => $inactiveTeam->id,
        'member_id' => $inactiveTeamMember->id,
        'session_id' => $currentSession->id,
        'left_on' => null,
    ]);
    TeamMember::factory()->create([
        'team_id' => $oldSessionTeam->id,
        'member_id' => $oldSessionMember->id,
        'session_id' => $oldSession->id,
        'left_on' => null,
    ]);
    TeamMember::factory()->create([
        'team_id' => $activeTeam->id,
        'member_id' => $removedRosterMember->id,
        'session_id' => $currentSession->id,
        'left_on' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $currentSession->id)
            ->has('sessions', 2)
            ->where('stats.members.total', 6)
            ->where('stats.members.active', 1)
            ->where('stats.members.inactive', 5)
            ->where('stats.members.by_status.ACTIVE', 5)
            ->where('stats.members.by_status.RETIRED', 1)
            ->where('stats.members.by_level.'.$activeRosterMember->player_level, 1)
            ->where('stats.members.by_gender.'.$activeRosterMember->gender, 1)
        );

    $this->actingAs($user)
        ->get(route('dashboard', ['session_id' => $oldSession->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedSession.id', $oldSession->id)
            ->where('stats.members.total', 6)
            ->where('stats.members.active', 1)
            ->where('stats.members.inactive', 5)
            ->where('stats.members.by_level.'.$oldSessionMember->player_level, 1)
            ->where('stats.members.by_gender.'.$oldSessionMember->gender, 1)
        );
});
