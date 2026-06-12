<?php

use App\Models\Member;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard shows active member data only', function () {
    $user = User::factory()->create();
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'ACTIVE',
    ]);
    Member::factory()->create([
        'organization_id' => $user->organization_id,
        'current_status' => 'RETIRED',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.members.active', 1)
            ->where('stats.members.by_status.ACTIVE', 1)
            ->missing('stats.members.by_status.RETIRED')
        );
});
