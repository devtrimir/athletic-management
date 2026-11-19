<?php

declare(strict_types=1);

use App\Models\User;

test('admin cannot see or use delete action for own user account', function (): void {
    $admin = rcUser('users.manage');
    $admin->update(['name' => 'Admin User']);
    $otherUser = User::factory()->create([
        'organization_id' => $admin->organization_id,
        'name' => 'Other User',
    ]);

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/users/index')
            ->where('users.0.id', $admin->id)
            ->where('users.0.can_delete', false)
            ->where('users.1.id', $otherUser->id)
            ->where('users.1.can_delete', true));

    $this->actingAs($admin)
        ->delete(route('users.destroy', $admin))
        ->assertForbidden();
});

test('the users listing sends each role with both language names for the Roles column', function (): void {
    $admin = rcUser('users.manage');

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('users.0.roles', 1)
            ->has('users.0.roles.0', fn ($role) => $role
                ->hasAll(['id', 'code', 'name_hi', 'name_en'])
                ->where('name_en', fn ($name) => is_string($name) && $name !== '')));
});
