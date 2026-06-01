<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function sportFilterUser(): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    return $user;
}

test('filter by sport_id returns only members of that sport', function () {
    $user = sportFilterUser();
    $org = $user->organization;

    $sportA = Sport::factory()->create(['organization_id' => $org->id]);
    $sportB = Sport::factory()->create(['organization_id' => $org->id]);

    $inSport = Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportA->id]);
    Member::factory()->create(['organization_id' => $org->id, 'sport_id' => $sportB->id]);
    Member::factory()->create(['organization_id' => $org->id, 'sport_id' => null]);

    $this->actingAs($user)
        ->get(route('members.index', ['filter' => ['sport_id' => $sportA->id]]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('members/index')
            ->where('members.total', 1)
            ->where('members.data.0.id', $inSport->id)
        );
});

test('sport_id is nullable on store — member created without sport', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach (['members.view', 'members.create'] as $code) {
        $perm = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => 'members', 'name_hi' => $code, 'name_en' => $code],
        );
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name_hi' => 'परीक्षण सदस्य',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
        ])
        ->assertRedirect();

    expect(Member::where('organization_id', $org->id)->first()->sport_id)->toBeNull();
});

test('sport_id must exist in sports table when provided', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

    foreach (['members.view', 'members.create'] as $code) {
        $perm = Permission::firstOrCreate(
            ['code' => $code],
            ['group' => 'members', 'name_hi' => $code, 'name_en' => $code],
        );
        DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    }

    $this->actingAs($user)
        ->post(route('members.store'), [
            'full_name_hi' => 'परीक्षण',
            'gender' => 'M',
            'player_category' => 'GD',
            'player_level' => 'ZONAL',
            'sport_id' => 99999,
        ])
        ->assertSessionHasErrors('sport_id');
});
