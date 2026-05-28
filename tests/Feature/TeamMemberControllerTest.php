<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function teamUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

function teamWithOrg(Organization $org): Team
{
    return Team::factory()->forOrganization($org)->create();
}

// ---------------------------------------------------------------------------
// auth / authz
// ---------------------------------------------------------------------------

test('unauthenticated POST to teams.members.store redirects to login', function (): void {
    $org = Organization::factory()->create();
    $team = teamWithOrg($org);

    $this->post(route('teams.members.store', $team), [])
        ->assertRedirect(route('login'));
});

test('user without teams.update gets 403 on add member', function (): void {
    $user = teamUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// happy path
// ---------------------------------------------------------------------------

test('add members inserts rows and redirects to teams.show', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
    ]);
});

// ---------------------------------------------------------------------------
// T13 — duplicate-add returns redirect-back with session errors
// ---------------------------------------------------------------------------

test('adding a member already on the team returns errors for that member_ids index', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertSessionHasErrors(['member_ids.0']);
});

test('duplicate-add does not create a second team_members row', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
        ]);

    $this->assertDatabaseCount('team_members', 1);
});

test('only the duplicate index carries an error when adding a mixed list', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $existing = Member::factory()->create(['organization_id' => $org->id]);
    $fresh = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $existing->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$existing->id, $fresh->id],
            'session_id' => $team->session_id,
        ])
        ->assertSessionHasErrors(['member_ids.0'])
        ->assertSessionDoesntHaveErrors(['member_ids.1']);
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

test('remove member deletes row and redirects to teams.show', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.members.destroy', [$team, $member]))
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseMissing('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
    ]);
});

// ---------------------------------------------------------------------------
// cross-session uniqueness (new business rule)
// ---------------------------------------------------------------------------

test('adding a member already in another team for the same session returns errors', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    // Member is already assigned to a DIFFERENT team for the same session.
    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertSessionHasErrors(['member_ids.0']);
});

test('cross-session conflict does not insert a row', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
        ]);

    // Only the original row should exist (in the other team).
    $this->assertDatabaseCount('team_members', 1);
    $this->assertDatabaseMissing('team_members', ['team_id' => $team->id]);
});
