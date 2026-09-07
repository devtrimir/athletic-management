<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSessionStatus;
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
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'PLAYER',
        'joined_on' => '2026-01-15 00:00:00',
    ]);
});

test('adding an inactive member marks them active and removing them marks them inactive', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team, ['current_status' => 'INACTIVE']);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
            'joined_on' => '2026-01-15',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('members', [
        'id' => $member->id,
        'current_status' => 'ACTIVE',
    ]);

    $this->actingAs($user)
        ->delete(route('teams.members.destroy', [$team, $member]), [
            'session_id' => $team->session_id,
            'left_on' => '2026-02-01',
            'reason' => 'Roster ended',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('members', [
        'id' => $member->id,
        'current_status' => 'INACTIVE',
    ]);
});

test('same member can be added to same team in a later session', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $nextSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = playableMember($org, $team);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $nextSession->id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $nextSession->id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $nextSession->id,
    ]);
    $this->assertDatabaseCount('team_members', 2);
});

test('adding member records roster movement', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'CAPTAIN',
            'joined_on' => '2026-01-15',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'action' => 'ADDED',
        'role' => 'CAPTAIN',
        'effective_on' => '2026-01-15 00:00:00',
        'created_by' => $user->id,
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

test('remove member marks row as left and records movement', function (): void {
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
        ->delete(route('teams.members.destroy', [$team, $member]), [
            'session_id' => $team->session_id,
            'left_on' => '2026-02-01',
            'reason' => 'Moved out of roster',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    expect($row = TeamMember::where('team_id', $team->id)
        ->where('member_id', $member->id)
        ->where('session_id', $team->session_id)
        ->first())->not->toBeNull()
        ->and($row->left_on?->toDateString())->toBe('2026-02-01');

    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'action' => 'REMOVED',
        'reason' => 'Moved out of roster',
        'source' => 'manual',
    ]);
});

test('removing the last active member marks the team session inactive when no current coaches remain', function (): void {
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
        ->delete(route('teams.members.destroy', [$team, $member]), [
            'session_id' => $team->session_id,
            'left_on' => '2026-02-01',
            'reason' => 'Roster closed',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_session_statuses', [
        'team_id' => $team->id,
        'session_id' => $team->session_id,
        'status' => TeamSessionStatus::STATUS_INACTIVE,
    ]);
});

test('removing a member keeps the team session active when another active member remains', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $removed = playableMember($org, $team);
    $remaining = playableMember($org, $team);

    TeamSessionStatus::factory()->create([
        'organization_id' => $org->id,
        'team_id' => $team->id,
        'session_id' => $team->session_id,
        'status' => TeamSessionStatus::STATUS_ACTIVE,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $removed->id,
        'session_id' => $team->session_id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $remaining->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.members.destroy', [$team, $removed]), [
            'session_id' => $team->session_id,
            'left_on' => '2026-02-01',
            'reason' => 'Roster update',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_session_statuses', [
        'team_id' => $team->id,
        'session_id' => $team->session_id,
        'status' => TeamSessionStatus::STATUS_ACTIVE,
    ]);
});

test('remove member requires audited date and reason', function (): void {
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
        ->delete(route('teams.members.destroy', [$team, $member]), [
            'session_id' => $team->session_id,
        ])
        ->assertSessionHasErrors(['left_on', 'reason']);

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'left_on' => null,
    ]);
});

test('bulk remove members requires and records the same audited removal details', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $first = playableMember($org, $team);
    $second = playableMember($org, $team);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $first->id,
        'session_id' => $team->session_id,
    ]);
    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $second->id,
        'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->delete(route('teams.members.bulkDestroy', $team), [
            'member_ids' => [$first->id, $second->id],
            'session_id' => $team->session_id,
            'left_on' => '2026-03-01',
            'reason' => 'Session roster cleanup',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    foreach ([$first, $second] as $member) {
        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $team->session_id,
            'left_on' => '2026-03-01 00:00:00',
        ]);
        $this->assertDatabaseHas('team_member_movements', [
            'team_id' => $team->id,
            'member_id' => $member->id,
            'session_id' => $team->session_id,
            'action' => 'REMOVED',
            'reason' => 'Session roster cleanup',
        ]);
    }
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
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);
});

test('member without target team sport is accepted and sport is assigned', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'ACTIVE']);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
    ]);
    $this->assertDatabaseHas('member_sport', [
        'member_id' => $member->id,
        'sport_id' => $team->sport_id,
    ]);
});

test('retired member is rejected for manual add', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team, ['current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'PLAYER',
        ])
        ->assertSessionHasErrors(['member_ids.0']);
});

test('historical backfill previews inactive playable member as warning', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = playableMember($org, $team, ['current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->postJson(route('teams.members.backfill.preview', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
            'joined_on' => '2024-01-01',
        ])
        ->assertSuccessful()
        ->assertJsonPath('summary.warning', 1)
        ->assertJsonPath('rows.0.status', 'warning')
        ->assertJsonPath('rows.0.member_id', $member->id);
});

test('historical backfill applies inactive playable member and records movement metadata', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = playableMember($org, $team, ['current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->post(route('teams.members.backfill', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
            'joined_on' => '2024-01-01',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $oldSession->id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'joined_on' => '2024-01-01 00:00:00',
        'left_on' => null,
    ]);
    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'action' => 'ADDED',
        'source' => 'backfill',
    ]);
});

test('historical backfill blocks member missing the team sport', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = Member::factory()->create(['organization_id' => $org->id, 'current_status' => 'RETIRED']);

    $this->actingAs($user)
        ->postJson(route('teams.members.backfill.preview', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
        ])
        ->assertSuccessful()
        ->assertJsonPath('summary.blocked', 1)
        ->assertJsonPath('rows.0.status', 'blocked');

    $this->actingAs($user)
        ->post(route('teams.members.backfill', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $oldSession->id]]));

    $this->assertDatabaseMissing('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
    ]);
});

test('historical backfill with left date records add and remove movements', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = playableMember($org, $team);

    $this->actingAs($user)
        ->post(route('teams.members.backfill', $team), [
            'paste' => $member->member_code.', PLAYER, 2023-01-01, 2023-05-01, Old roster exit',
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $oldSession->id]]));

    $this->assertDatabaseHas('team_members', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'joined_on' => '2023-01-01 00:00:00',
        'left_on' => '2023-05-01 00:00:00',
    ]);
    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'action' => 'ADDED',
        'source' => 'backfill',
    ]);
    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'action' => 'REMOVED',
        'reason' => 'Old roster exit',
        'source' => 'backfill',
    ]);
});

test('historical backfill blocks same sport active conflict', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $otherTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $oldSession->id,
        'sport_id' => $team->sport_id,
    ]);
    $member = playableMember($org, $team);

    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
    ]);

    $this->actingAs($user)
        ->postJson(route('teams.members.backfill.preview', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
        ])
        ->assertSuccessful()
        ->assertJsonPath('summary.blocked', 1)
        ->assertJsonPath('rows.0.status', 'blocked');
});

test('historical backfill is idempotent for already recorded roster rows', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $oldSession = SportSession::factory()->create(['organization_id' => $org->id]);
    $member = playableMember($org, $team);

    TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $oldSession->id,
        'left_on' => '2023-05-01',
    ]);

    $this->actingAs($user)
        ->post(route('teams.members.backfill', $team), [
            'member_ids' => [$member->id],
            'session_id' => $oldSession->id,
            'role' => 'PLAYER',
            'joined_on' => '2023-01-01',
            'left_on' => '2023-05-01',
            'reason' => 'Already imported',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $oldSession->id]]));

    $this->assertDatabaseCount('team_members', 1);
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
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

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

test('re-adding a removed member reactivates the same row and marks member active', function (): void {
    $user = teamUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);
    $member = playableMember($org, $team, ['current_status' => 'ACTIVE']);

    $row = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'CAPTAIN',
        'left_on' => '2026-02-01',
    ]);

    $member->update(['current_status' => 'INACTIVE']);

    $this->actingAs($user)
        ->post(route('teams.members.store', $team), [
            'member_ids' => [$member->id],
            'session_id' => $team->session_id,
            'role' => 'CAPTAIN',
            'joined_on' => '2026-03-01',
        ])
        ->assertRedirect(route('teams.show', ['team' => $team, 'filter' => ['session_id' => $team->session_id]]));

    expect($row->fresh())->not->toBeNull()
        ->and($row->fresh()->left_on)->toBeNull()
        ->and($row->fresh()->joined_on?->toDateString())->toBe('2026-03-01');

    $this->assertDatabaseHas('members', [
        'id' => $member->id,
        'current_status' => 'ACTIVE',
    ]);

    $this->assertDatabaseHas('team_member_movements', [
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'action' => 'ADDED',
        'role' => 'CAPTAIN',
        'source' => 'manual',
    ]);
});

// ---------------------------------------------------------------------------
// teams.members.available (unassigned inactive members by sport)
// ---------------------------------------------------------------------------

test('unauthenticated GET to teams.members.available redirects to login', function (): void {
    $org = Organization::factory()->create();
    $team = teamWithOrg($org);

    $this->get(route('teams.members.available', $team))
        ->assertRedirect(route('login'));
});

test('user without teams.view gets 403 on teams.members.available', function (): void {
    $user = teamUser('members.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);

    $this->actingAs($user)
        ->get(route('teams.members.available', $team))
        ->assertForbidden();
});

test('available members returns unassigned members associated with the sport', function (): void {
    $user = teamUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);

    // Member 1: Has team sport in playableSports, no team -> should be available
    $unassignedMember = playableMember($org, $team, ['full_name' => 'अनिल कुमार']);

    // Member 2: Associated with another sport -> should NOT be available
    $otherSport = Sport::factory()->create(['organization_id' => $org->id]);
    $otherMember = Member::factory()->create([
        'organization_id' => $org->id,
        'full_name' => 'सुनील कुमार',
        'sport_id' => $otherSport->id,
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('teams.members.available', ['team' => $team, 'sport_id' => $team->sport_id]))
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'full_name', 'pno', 'member_code', 'current_status']]]);

    $data = $response->json('data');
    $ids = collect($data)->pluck('id')->all();

    expect($ids)->toContain($unassignedMember->id)
        ->and($ids)->not->toContain($otherMember->id);
});

test('available members excludes members currently assigned to an active team', function (): void {
    $user = teamUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);

    // Member currently in another active team
    $otherTeam = Team::factory()->forOrganization($org)->create(['is_active' => true]);
    $activePlayer = playableMember($org, $team, ['full_name' => 'सक्रिय खिलाड़ी']);
    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $activePlayer->id,
        'session_id' => $otherTeam->session_id,
        'left_on' => null,
    ]);

    // Member who left a team in the past -> should be available
    $formerPlayer = playableMember($org, $team, ['full_name' => 'भूतपूर्व खिलाड़ी']);
    TeamMember::factory()->create([
        'team_id' => $otherTeam->id,
        'member_id' => $formerPlayer->id,
        'session_id' => $otherTeam->session_id,
        'left_on' => '2025-12-31',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('teams.members.available', ['team' => $team, 'sport_id' => $team->sport_id]))
        ->assertOk();

    $ids = collect($response->json('data'))->pluck('id')->all();

    expect($ids)->toContain($formerPlayer->id)
        ->and($ids)->not->toContain($activePlayer->id);
});

test('available members filters by category, level, and query string', function (): void {
    $user = teamUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = teamWithOrg($org);

    $gdMember = playableMember($org, $team, [
        'full_name' => 'सुरेश सिंह',
        'pno' => '092837461',
        'player_category' => 'GD',
        'player_level' => 'ZONAL',
    ]);

    $quotaMember = playableMember($org, $team, [
        'full_name' => 'महेश सिंह',
        'pno' => '123847562',
        'player_category' => 'SPORTS_QUOTA',
        'player_level' => 'NATIONAL',
    ]);

    // Filter category = GD
    $resCat = $this->actingAs($user)
        ->getJson(route('teams.members.available', ['team' => $team, 'player_category' => 'GD']))
        ->assertOk();
    $catIds = collect($resCat->json('data'))->pluck('id')->all();
    expect($catIds)->toContain($gdMember->id)
        ->and($catIds)->not->toContain($quotaMember->id);

    // Filter query = Mahesh
    $resQuery = $this->actingAs($user)
        ->getJson(route('teams.members.available', ['team' => $team, 'q' => 'महेश']))
        ->assertOk();
    $queryIds = collect($resQuery->json('data'))->pluck('id')->all();
    expect($queryIds)->toContain($quotaMember->id)
        ->and($queryIds)->not->toContain($gdMember->id);
});
