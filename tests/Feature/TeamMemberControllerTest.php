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

function playableMember(Organization $org, Team $team, array $attributes = []): Member
{
    $member = Member::factory()->create(array_merge(['organization_id' => $org->id], $attributes));
    $member->playableSports()->sync([$team->sport_id]);

    return $member;
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
    $member = playableMember($org, $team);

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
    $member = playableMember($org, $team);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
            'joined_on' => '2026-01-15',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
        'joined_on' => '2026-01-15 00:00:00',
    ]);
});

// ---------------------------------------------------------------------------
// T13 — duplicate-add returns redirect-back with session errors
// ---------------------------------------------------------------------------

test('adding a member already on the team returns errors for that member_ids index', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team);

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
    $member = playableMember($org, $team);

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
    $existing = playableMember($org, $team);
    $fresh = playableMember($org, $team);

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
    $member = playableMember($org, $team);

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
// one team per sport per session
// ---------------------------------------------------------------------------

test('adding a member already in another team for the same session and sport returns errors', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $team->session_id,
        'sport_id' => $team->sport_id,
    ]);
    $member = playableMember($org, $team);

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

test('same session and sport conflict does not insert a row', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $team->session_id,
        'sport_id' => $team->sport_id,
    ]);
    $member = playableMember($org, $team);

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

test('member can join another team in the same session for a different playable sport', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $otherTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $team->session_id,
    ]);
    $member = playableMember($org, $team);
    $member->playableSports()->syncWithoutDetaching([$otherTeam->sport_id]);

    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);
});

test('member without target team sport is rejected', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'role' => 'PLAYER',
        ])
        ->assertSessionHasErrors(['member_ids.0']);

    $this->assertDatabaseMissing('team_members', ['team_id' => $team->id]);
});

test('inactive member is rejected', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team, ['current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'role' => 'PLAYER',
        ])
        ->assertSessionHasErrors(['member_ids.0']);
});

test('membership row can update role and dates', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team);
    $row = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
    ]);

    $this->actingAs($user)
        ->patch(route('teams.members.update', [$team, $row]), [
            'role' => 'CAPTAIN',
            'joined_on' => '2026-01-01',
            'left_on' => '2026-02-01',
        ])
        ->assertRedirect(route('teams.show', $team));

    $this->assertDatabaseHas('team_members', [
        'id' => $row->id,
        'role' => 'CAPTAIN',
        'joined_on' => '2026-01-01 00:00:00',
        'left_on' => '2026-02-01 00:00:00',
    ]);
});

test('membership update rejects left date before joined date', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team);
    $row = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->patch(route('teams.members.update', [$team, $row]), [
            'role' => 'PLAYER',
            'joined_on' => '2026-02-01',
            'left_on' => '2026-01-01',
        ])
        ->assertSessionHasErrors(['left_on']);
});
