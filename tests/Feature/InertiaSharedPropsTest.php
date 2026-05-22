<?php

use App\Models\Organization;
use App\Models\User;

beforeEach(function (): void {
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create([
        'organization_id' => $this->org->id,
        'email_verified_at' => now(),
    ]);
});

it('includes translations key in shared inertia props', function (): void {
    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->has('translations'));
});

it('translations defaults to empty array when no lang file has content', function (): void {
    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('translations', []));
});

it('includes flash key in shared inertia props with null toast by default', function (): void {
    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->has('flash')
            ->where('flash.toast', null)
        );
});

it('flash toast is populated from session when present', function (): void {
    $toastData = ['type' => 'success', 'message' => 'Saved!'];

    $this->actingAs($this->user)
        ->withSession(['flash.toast' => $toastData])
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('flash.toast', $toastData)
        );
});
