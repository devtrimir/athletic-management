<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// --- role_permission ---

test('role_permission table has expected columns', function (): void {
    expect(Schema::hasColumns('role_permission', ['role_id', 'permission_id']))->toBeTrue();
});

test('role can have permissions attached via belongsToMany', function (): void {
    $role = Role::factory()->create();
    $perm = Permission::factory()->create();

    $role->permissions()->attach($perm->id);

    expect($role->permissions)->toHaveCount(1)
        ->and($role->permissions->first()->id)->toBe($perm->id);
});

test('role_permission cascades when role is deleted', function (): void {
    $role = Role::factory()->create();
    $perm = Permission::factory()->create();
    $role->permissions()->attach($perm->id);

    $role->delete();

    expect(DB::table('role_permission')->where('permission_id', $perm->id)->count())->toBe(0);
});

// --- user_role ---

test('user_role table has expected columns', function (): void {
    expect(Schema::hasColumns('user_role', ['user_id', 'role_id', 'organization_id', 'assigned_by', 'assigned_at']))->toBeTrue();
});

test('user_role row can be inserted directly', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);

    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
        'assigned_by' => null,
        'assigned_at' => now(),
    ]);

    expect(DB::table('user_role')->where('user_id', $user->id)->count())->toBe(1);
});

test('user_role cascades when organization is deleted', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);
    $role = Role::factory()->create(['organization_id' => $org->id]);
    DB::table('user_role')->insert([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'organization_id' => $org->id,
        'assigned_by' => null,
        'assigned_at' => now(),
    ]);

    $org->delete();

    expect(DB::table('user_role')->where('user_id', $user->id)->count())->toBe(0);
});
