<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;

// --- permissions ---

test('permissions table has expected columns', function (): void {
    expect(Schema::hasColumns('permissions', ['id', 'code', 'group', 'name_hi', 'name_en', 'description']))->toBeTrue();
});

test('permission factory creates a valid record', function (): void {
    $perm = Permission::factory()->create();

    expect($perm->id)->toBeInt()
        ->and($perm->code)->toBeString()->not->toBeEmpty()
        ->and($perm->group)->toBeString()->not->toBeEmpty();
});

test('permission code enforces unique constraint', function (): void {
    Permission::factory()->create(['code' => 'members.view']);

    expect(fn () => Permission::factory()->create(['code' => 'members.view']))
        ->toThrow(QueryException::class);
});

// --- roles ---

test('roles table has expected columns', function (): void {
    expect(Schema::hasColumns('roles', ['id', 'organization_id', 'code', 'name_hi', 'name_en', 'is_system', 'description']))->toBeTrue();
});

test('role factory creates a valid record with organization', function (): void {
    $role = Role::factory()->create();

    expect($role->id)->toBeInt()
        ->and($role->is_system)->toBeFalse()
        ->and($role->organization)->toBeInstanceOf(Organization::class);
});

test('role code is unique per organization', function (): void {
    $org = Organization::factory()->create();
    Role::factory()->create(['organization_id' => $org->id, 'code' => 'admin']);

    expect(fn () => Role::factory()->create(['organization_id' => $org->id, 'code' => 'admin']))
        ->toThrow(QueryException::class);
});

test('same role code is allowed in different organizations', function (): void {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();

    Role::factory()->create(['organization_id' => $org1->id, 'code' => 'admin']);
    $role2 = Role::factory()->create(['organization_id' => $org2->id, 'code' => 'admin']);

    expect($role2->id)->toBeInt();
});
