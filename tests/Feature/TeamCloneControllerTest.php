<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert([
            'user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id,
        ]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert([
                'role_id' => $role->id, 'permission_id' => $perm->id,
            ]);
        }
    }

    return $user;
}

function cloneTeamWithOrg(Organization $org): Team
{
    return Team::factory()->forOrganization($org)->create();
}

function anotherSession(Organization $org): SportSession
{
    return SportSession::factory()->create(['organization_id' => $org->id]);
}

function clonePlayableMember(Organization $org, Team $team, array $attributes = []): Member
{
    $member = Member::factory()->create(array_merge(['organization_id' => $org->id], $attributes));
    $member->playableSports()->sync([$team->sport_id]);

    return $member;
}

// ---------------------------------------------------------------------------
// auth / authz
// ---------------------------------------------------------------------------

test('unauthenticated POST to teams.clone redirects to login', function (): void {
    $org = Organization::factory()->create();
    $team = cloneTeamWithOrg($org);
    $session = anotherSession($org);

    $this->post(route('teams.clone', $team), ['session_id' => $session->id, 'member_ids' => [], 'coach_ids' => []])
        ->assertRedirect(route('login'));
});

test('user without teams.update gets 403 on clone', function (): void {
    $user = cloneUser('teams.view');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $session = anotherSession($org);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), ['session_id' => $session->id, 'member_ids' => [], 'coach_ids' => []])
        ->assertForbidden();
});

test('org B user cannot clone org A team', function (): void {
    $userA = cloneUser('teams.update');
    $orgA = Organization::find($userA->organization_id);
    $teamA = cloneTeamWithOrg($orgA);

    $userB = cloneUser('teams.update');
    $orgB = Organization::find($userB->organization_id);
    $sessionB = SportSession::factory()->create(['organization_id' => $orgB->id]);

    // BelongsToOrganization global scope makes org A's team invisible → 404 (not 403)
    $this->actingAs($userB)
        ->post(route('teams.clone', $teamA), ['session_id' => $sessionB->id, 'member_ids' => [], 'coach_ids' => []])
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

test('cloning to the same session is rejected', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $team->session_id,
            'member_ids' => [],
            'coach_ids' => [],
        ])
        ->assertSessionHasErrors(['session_id']);
});

// ---------------------------------------------------------------------------
// happy path
// ---------------------------------------------------------------------------

test('clone creates a new team with same name for the target session', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $targetSession = anotherSession($org);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $targetSession->id,
            'member_ids' => [],
            'coach_ids' => [],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('teams', [
        'organization_id' => $org->id,
        'sport_id' => $team->sport_id,
        'unit_id' => $team->unit_id,
        'session_id' => $targetSession->id,
        'name' => $team->name,
    ]);
});

test('selected members are copied to the new team with the target session', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $targetSession = anotherSession($org);

    $member = clonePlayableMember($org, $team);
    $row = TeamMember::factory()->create([
        'team_id' => $team->id,
        'member_id' => $member->id,
        'session_id' => $team->session_id,
        'role' => 'CAPTAIN',
    ]);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $targetSession->id,
            'member_ids' => [$row->id],
            'coach_ids' => [],
        ]);

    $newTeam = Team::where('session_id', $targetSession->id)->first();
    $this->assertNotNull($newTeam);

    $this->assertDatabaseHas('team_members', [
        'team_id' => $newTeam->id,
        'member_id' => $member->id,
        'session_id' => $targetSession->id,
        'role' => 'CAPTAIN',
    ]);
});

test('selected coaches are copied to the new team', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $targetSession = anotherSession($org);

    $coach = Coach::factory()->create(['organization_id' => $org->id]);
    $row = CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $coach->id,
        'session_id' => $team->session_id,
        'role' => 'HEAD',
    ]);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $targetSession->id,
            'member_ids' => [],
            'coach_ids' => [$row->id],
        ]);

    $newTeam = Team::where('session_id', $targetSession->id)->first();
    $this->assertDatabaseHas('coach_assignments', [
        'team_id' => $newTeam->id,
        'coach_id' => $coach->id,
        'session_id' => $targetSession->id,
    ]);
});

test('conflicting members are skipped and non-conflicting are copied', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $targetSession = anotherSession($org);
    $anotherTeam = Team::factory()->forOrganization($org)->create([
        'session_id' => $targetSession->id,
        'sport_id' => $team->sport_id,
    ]);

    $conflicting = clonePlayableMember($org, $team);
    $safe = clonePlayableMember($org, $team);

    $conflictRow = TeamMember::factory()->create([
        'team_id' => $team->id, 'member_id' => $conflicting->id, 'session_id' => $team->session_id,
    ]);
    $safeRow = TeamMember::factory()->create([
        'team_id' => $team->id, 'member_id' => $safe->id, 'session_id' => $team->session_id,
    ]);

    // Pre-assign the conflicting member to another team for the target session.
    TeamMember::factory()->create([
        'team_id' => $anotherTeam->id, 'member_id' => $conflicting->id, 'session_id' => $targetSession->id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $targetSession->id,
            'member_ids' => [$conflictRow->id, $safeRow->id],
            'coach_ids' => [],
        ]);

    $newTeam = Team::where('session_id', $targetSession->id)
        ->where('sport_id', $team->sport_id)
        ->first();

    // Safe member was copied; conflicting was skipped.
    $this->assertDatabaseHas('team_members', ['team_id' => $newTeam->id, 'member_id' => $safe->id]);
    $this->assertDatabaseMissing('team_members', ['team_id' => $newTeam->id, 'member_id' => $conflicting->id]);
});

test('inactive and non-playable members are skipped during clone', function (): void {
    $user = cloneUser('teams.update');
    $org = Organization::find($user->organization_id);
    $team = cloneTeamWithOrg($org);
    $targetSession = anotherSession($org);

    $inactive = clonePlayableMember($org, $team, ['current_status' => 'RETIRED']);
    $nonPlayable = Member::factory()->create(['organization_id' => $org->id]);
    $safe = clonePlayableMember($org, $team);

    $inactiveRow = TeamMember::factory()->create([
        'team_id' => $team->id, 'member_id' => $inactive->id, 'session_id' => $team->session_id,
    ]);
    $nonPlayableRow = TeamMember::factory()->create([
        'team_id' => $team->id, 'member_id' => $nonPlayable->id, 'session_id' => $team->session_id,
    ]);
    $safeRow = TeamMember::factory()->create([
        'team_id' => $team->id, 'member_id' => $safe->id, 'session_id' => $team->session_id,
    ]);

    $this->actingAs($user)
        ->post(route('teams.clone', $team), [
            'session_id' => $targetSession->id,
            'member_ids' => [$inactiveRow->id, $nonPlayableRow->id, $safeRow->id],
            'coach_ids' => [],
        ]);

    $newTeam = Team::where('session_id', $targetSession->id)
        ->where('sport_id', $team->sport_id)
        ->first();

    $this->assertDatabaseHas('team_members', ['team_id' => $newTeam->id, 'member_id' => $safe->id]);
    $this->assertDatabaseMissing('team_members', ['team_id' => $newTeam->id, 'member_id' => $inactive->id]);
    $this->assertDatabaseMissing('team_members', ['team_id' => $newTeam->id, 'member_id' => $nonPlayable->id]);
});
