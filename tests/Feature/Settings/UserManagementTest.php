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

test('no page data sent on GET requests ever contains a password or other secret key', function (): void {
    $admin = rcUser('users.manage', 'audit_logs.view', 'members.view');
    $other = User::factory()->create(['organization_id' => $admin->organization_id]);
    $other->update(['password' => 'a-new-password-1']);
    $secretKey = '/"(password|current_password|password_confirmation|remember_token|two_factor_secret|two_factor_recovery_codes)"\s*:/';

    foreach ([
        route('dashboard'),
        route('users.index'),
        route('users.create'),
        route('users.edit', $other),
        route('profile.edit'),
        route('audit-logs.index'),
    ] as $url) {
        $response = $this->actingAs($admin)->get($url);

        expect($response->status())->toBeIn([200, 403], $url);
        expect(preg_match($secretKey, str_replace('&quot;', '"', (string) $response->getContent())))->toBe(0, $url);
    }

    // The shared logged-in user never carries the hash either.
    $this->actingAs($admin)->get(route('users.index'))
        ->assertInertia(fn ($page) => $page->missing('auth.user.password'));
});
