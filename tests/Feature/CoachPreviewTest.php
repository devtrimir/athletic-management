<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
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
        ->assertJsonStructure(['id', 'full_name', 'mobile', 'nis_certified']);
});

test('user cannot preview coach from another organization', function () {
    $user = coachPreviewUser();
    $other = Organization::factory()->create();
    $coach = Coach::factory()->create(['organization_id' => $other->id]);

    $this->actingAs($user)
        ->getJson(route('v1.coaches.preview', $coach))
        ->assertNotFound();
});
