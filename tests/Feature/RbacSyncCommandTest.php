<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rbac:sync inserts all permissions from the catalog', function (): void {
    expect(Permission::count())->toBe(0);

    $this->artisan('rbac:sync')->assertSuccessful();

    $catalogCount = count(config('rbac.permissions', []));

    expect(Permission::count())->toBe($catalogCount);
});

test('rbac:sync is idempotent — running twice yields the same row count', function (): void {
    $this->artisan('rbac:sync')->assertSuccessful();

    $catalogCount = count(config('rbac.permissions', []));

    expect(Permission::count())->toBe($catalogCount);
});

test('rbac:sync overwrites stale labels when catalog changes', function (): void {
    // Pre-seed a row with outdated labels.
    Permission::create([
        'code' => 'members.view',
        'group' => 'members',
        'name_hi' => 'पुराना',
        'name_en' => 'Old label',
    ]);

    $this->artisan('rbac:sync')->assertSuccessful();

    $updated = Permission::where('code', 'members.view')->sole();

    expect($updated->name_en)->toBe('View members');
});

test('rbac:sync assigns every permission to admin roles', function (): void {
    $org = Organization::factory()->create();
    $adminRole = Role::factory()->create([
        'organization_id' => $org->id,
        'code' => 'admin',
    ]);

    $this->artisan('rbac:sync')->assertSuccessful();

    expect($adminRole->permissions()->count())->toBe(Permission::count());
});

test('rbac:sync adds new permissions to existing admin roles', function (): void {
    $org = Organization::factory()->create();
    $adminRole = Role::factory()->create([
        'organization_id' => $org->id,
        'code' => 'admin',
    ]);

    $this->artisan('rbac:sync')->assertSuccessful();
    $catalogCount = Permission::count();

    // A permission added outside the catalog still exists in the table and
    // should be granted to admin so the DB matches the backend "all access" rule.
    $extraPermission = Permission::factory()->create();

    $this->artisan('rbac:sync')->assertSuccessful();

    expect(Permission::count())->toBe($catalogCount + 1);
    expect($adminRole->permissions()->pluck('permissions.id'))->toContain($extraPermission->id);
});
