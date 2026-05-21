<?php

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);

    $this->permission = Permission::factory()->create(['code' => 'members.view']);
});

test('admin system-role user passes every Gate check', function (): void {
    $adminRole = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'admin',
        'is_system' => true,
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $adminRole->id,
        'organization_id' => $this->org->id,
    ]);

    expect(Gate::forUser($this->user)->check('members.view'))->toBeTrue()
        ->and(Gate::forUser($this->user)->check('anything.at.all'))->toBeTrue();
});

test('user with correct permission passes the matching Gate check', function (): void {
    $role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'data_entry',
        'is_system' => false,
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    DB::table('role_permission')->insert([
        'role_id' => $role->id,
        'permission_id' => $this->permission->id,
    ]);

    expect(Gate::forUser($this->user)->check('members.view'))->toBeTrue();
});

test('user without the permission fails the Gate check', function (): void {
    $role = Role::factory()->create([
        'organization_id' => $this->org->id,
        'code' => 'viewer',
        'is_system' => false,
    ]);

    DB::table('user_role')->insert([
        'user_id' => $this->user->id,
        'role_id' => $role->id,
        'organization_id' => $this->org->id,
    ]);

    // Role has no permissions assigned
    expect(Gate::forUser($this->user)->check('members.view'))->toBeFalse();
});
