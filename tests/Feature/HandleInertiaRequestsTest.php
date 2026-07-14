<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('authenticated user with permissions has permissions array in shared props', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id, 'locale' => 'en']);

    $perm = Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id,
    ]);
    DB::table('role_permission')->insert([
        'role_id' => $role->id, 'permission_id' => $perm->id,
    ]);

    $response = $this->actingAs($user)->get('/');

    $response->assertInertia(
        fn ($page) => $page
            ->has('auth.permissions')
            ->where('auth.permissions', ['members.view']),
    );
});

test('admin user receives full permission catalog in shared props', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id, 'locale' => 'en']);

    Permission::firstOrCreate(
        ['code' => 'members.view'],
        ['group' => 'members', 'name_hi' => 'members.view', 'name_en' => 'members.view'],
    );
    Permission::firstOrCreate(
        ['code' => 'coaches.view'],
        ['group' => 'coaches', 'name_hi' => 'coaches.view', 'name_en' => 'coaches.view'],
    );

    $adminRole = Role::factory()->create([
        'organization_id' => $org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $adminRole->id,
        'organization_id' => $org->id,
    ]);

    $response = $this->actingAs($user)->get('/');

    $response->assertInertia(
        fn ($page) => $page
            ->has('auth.permissions')
            ->where('auth.permissions', ['coaches.view', 'members.view']),
    );
});

test('guest has empty permissions array in shared props', function (): void {
    $response = $this->get('/');

    $response->assertInertia(
        fn ($page) => $page
            ->has('auth.permissions')
            ->where('auth.permissions', []),
    );
});

test('locale prop reflects the value set by SetLocale middleware', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id, 'locale' => 'en']);

    $response = $this->actingAs($user)->get('/');

    $response->assertInertia(
        fn ($page) => $page->where('locale', 'en'),
    );
});
