<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('sidebar layout renders the compact page header and locale switcher in the footer', function (): void {
    $organization = Organization::factory()->create();
    $user = User::factory()->create([
        'organization_id' => $organization->id,
        'locale' => 'en',
    ]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk();
    $response->assertInertia(
        fn ($page) => $page
            ->component('dashboard')
            ->where('locale', 'en')
            ->has('sidebarOpen'),
    );
});
