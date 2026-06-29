<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function teamPreviewUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'teams.view'],
        ['group' => 'teams', 'name_hi' => 'teams.view', 'name_en' => 'teams.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

test('unauthenticated user cannot access team preview', function () {
    $team = Team::factory()->create();

    $this->getJson(route('v1.teams.preview', $team))
        ->assertUnauthorized();
});

test('user without permission cannot access team preview', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $team = Team::factory()->create(['organization_id' => $org->id]);

    $this->actingAs($user)
        ->getJson(route('v1.teams.preview', $team))
        ->assertForbidden();
});

test('authorized user can view team preview', function () {
    $user = teamPreviewUser();
    $session = SportSession::factory()->create(['organization_id' => $user->organization_id]);
    $team = Team::factory()->create([
        'organization_id' => $user->organization_id,
        'session_id' => $session->id,
    ]);
    $currentCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $removedCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $currentCoach->id,
        'session_id' => $session->id,
        'is_current' => true,
    ]);
    CoachAssignment::factory()->create([
        'team_id' => $team->id,
        'coach_id' => $removedCoach->id,
        'session_id' => $session->id,
        'is_current' => false,
        'removed_at' => now(),
    ]);

    $this->actingAs($user)
        ->getJson(route('v1.teams.preview', ['team' => $team, 'session_id' => $session->id]))
        ->assertOk()
        ->assertJsonStructure(['id', 'name', 'location_type', 'is_active', 'players_count', 'coaches_count'])
        ->assertJsonPath('coaches_count', 1)
        ->assertJsonPath('coaches.0.full_name', $currentCoach->full_name)
        ->assertJsonMissing(['full_name' => $removedCoach->full_name]);
});

test('user cannot preview team from another organization', function () {
    $user = teamPreviewUser();
    $other = Organization::factory()->create();
    $team = Team::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->getJson(route('v1.teams.preview', $team))
        ->assertNotFound();
});
