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
