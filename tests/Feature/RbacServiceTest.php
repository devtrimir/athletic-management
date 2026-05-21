<?php

use App\Auth\Rbac;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->rbac = app(Rbac::class);

    $this->org = Organization::factory()->create();

    $this->user = User::factory()->create(['organization_id' => $this->org->id]);

    $this->role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'data_entry',
    ]);

    $this->permission = Permission::factory()->create(['code' => 'members.view']);

    // Assign role to permission
    DB::table('role_permission')->insert([
        'role_id' => $this->role->id,
        'permission_id' => $this->permission->id,
    ]);

    // Assign role to user in org
    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $this->role->id,
        'organization_id' => $this->org->id,
    ]);
});

test('userRoles returns roles for user in org', function (): void {
    $roles = $this->rbac->userRoles($this->user, $this->org->id);

    expect($roles)->toHaveCount(1)
        ->and($roles->first()->code)->toBe('data_entry');
});

test('userPermissions returns permission codes for user in org', function (): void {
    $permissions = $this->rbac->userPermissions($this->user, $this->org->id);

    expect($permissions)->toContain('members.view');
});

test('userHasPermission returns true when user holds the permission', function (): void {
    expect($this->rbac->userHasPermission($this->user, 'members.view', $this->org->id))->toBeTrue();
});

test('userHasPermission returns false for unknown permission', function (): void {
    expect($this->rbac->userHasPermission($this->user, 'settings.manage', $this->org->id))->toBeFalse();
});

test('userHasPermission resolves org from user when orgId is null', function (): void {
    expect($this->rbac->userHasPermission($this->user, 'members.view'))->toBeTrue();
});

test('userRoles is memoized — same object returned on second call', function (): void {
    $roles1 = $this->rbac->userRoles($this->user, $this->org->id);
    $roles2 = $this->rbac->userRoles($this->user, $this->org->id);

    expect($roles1)->toBe($roles2);
});

test('invalidate clears in-process memo so fresh data is returned', function (): void {
    // Warm the memo
    $this->rbac->userRoles($this->user, $this->org->id);
    $this->rbac->userPermissions($this->user, $this->org->id);

    // Remove the role assignment
    DB::table('user_role')->where('user_id', $this->user->id)->delete();

    // Without invalidation, memo still has stale data
    expect($this->rbac->userRoles($this->user, $this->org->id))->toHaveCount(1);

    // After invalidation a fresh query is issued
    $this->rbac->invalidate($this->user->id, $this->org->id);

    expect($this->rbac->userRoles($this->user, $this->org->id))->toHaveCount(0);
});
