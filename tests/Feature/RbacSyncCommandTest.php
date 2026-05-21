<?php

use App\Models\Permission;
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
    $this->artisan('rbac:sync')->assertSuccessful();

    $catalogCount = count(config('rbac.permissions', []));

    expect(Permission::count())->toBe($catalogCount);
});

test('rbac:sync overwrites stale labels when catalog changes', function (): void {
    // Pre-seed a row with an outdated English label.
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
