<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);

    // Disposable test routes registered fresh each test.
    Route::get('/test-role', fn () => 'ok')->middleware(['web', 'role:admin|data_entry']);
    Route::get('/test-permission', fn () => 'ok')->middleware(['web', 'permission:members.view']);
});

// ---------- role middleware ----------

test('role middleware passes when user holds any required role', function (): void {
    $role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'data_entry',
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    $this->actingAs($this->user)
        ->get('/test-role')
        ->assertOk();
});

test('role middleware returns 403 when user holds none of the required roles', function (): void {
    $role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'viewer',
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    $this->actingAs($this->user)
        ->get('/test-role')
        ->assertForbidden();
});

// ---------- permission middleware ----------

test('permission middleware passes when user holds any required permission', function (): void {
    $permission = Permission::factory()->create(['code' => 'members.view']);
    $role = Role::factory()->create(['organization_id' => $this->org->id]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    DB::table('role_permission')->insert([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
    ]);

    $this->actingAs($this->user)
        ->get('/test-permission')
        ->assertOk();
});

test('permission middleware returns 403 when user holds none of the required permissions', function (): void {
    $role = Role::factory()->create(['organization_id' => $this->org->id]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    // No permissions assigned to role
    $this->actingAs($this->user)
        ->get('/test-permission')
        ->assertForbidden();
});

// ---------- unauthenticated ----------

// Both middlewares are always chained after the `auth` middleware in real routes.
// When no user is present they abort 403 (auth middleware would redirect first in production).

test('role middleware returns 403 for unauthenticated requests', function (): void {
    $this->get('/test-role')->assertForbidden();
});

test('permission middleware returns 403 for unauthenticated requests', function (): void {
    $this->get('/test-permission')->assertForbidden();
});
