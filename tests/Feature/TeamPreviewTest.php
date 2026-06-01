<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
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
    $team = Team::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->getJson(route('v1.teams.preview', $team))
        ->assertOk()
        ->assertJsonStructure(['id', 'name_hi', 'players_count', 'coaches_count']);
});

test('user cannot preview team from another organization', function () {
    $user = teamPreviewUser();
    $other = Organization::factory()->create();
    $team = Team::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->getJson(route('v1.teams.preview', $team))
        ->assertNotFound();
});
