<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

test('admin role show page marks every permission as checked', function (): void {
    /** @var User $user */
    $user = rcUser('users.manage');
    $orgId = (int) $user->organization_id;

    $adminRole = Role::factory()->create([
        'organization_id' => $orgId,
        'code' => 'admin',
    ]);

    $this->actingAs($user)
        ->get(route('roles.show', $adminRole))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/roles/show')
            ->where('role_permission_ids', Permission::orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all()));
});

test('non-admin role show page only marks assigned permissions as checked', function (): void {
    /** @var User $user */
    $user = rcUser('users.manage');
    $orgId = (int) $user->organization_id;

    $role = Role::factory()->create([
        'organization_id' => $orgId,
        'code' => 'officer',
    ]);

    $assignedIds = Permission::limit(3)->pluck('id')->map(fn ($id) => (int) $id)->all();
    $role->permissions()->sync($assignedIds);

    $this->actingAs($user)
        ->get(route('roles.show', $role))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/roles/show')
            ->where('role_permission_ids', $assignedIds));
});

test('roles index reports full permission count for admin', function (): void {
    /** @var User $user */
    $user = rcUser('users.manage');
    $orgId = (int) $user->organization_id;

    Role::factory()->create([
        'organization_id' => $orgId,
        'code' => 'admin',
    ]);

    $this->actingAs($user)
        ->get(route('roles.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/roles/index')
            ->has('roles')
            ->where('roles', fn ($roles) => $roles
                ->first(fn (array $r) => $r['code'] === 'admin')['permissions_count'] === Permission::count()));
});
