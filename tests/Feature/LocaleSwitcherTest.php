<?php

use App\Models\User;

test('authenticated user can switch locale and it persists to users table', function (): void {
    $user = User::factory()->create(['locale' => 'hi']);

    $response = $this->actingAs($user)->patch('/locale', ['locale' => 'en']);

    $response->assertRedirectBack();
    expect($user->fresh()->locale)->toBe('en');
    expect(session('locale'))->toBe('en');
});

test('authenticated user can switch back to hindi', function (): void {
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)->patch('/locale', ['locale' => 'hi']);

    expect($user->fresh()->locale)->toBe('hi');
    expect(session('locale'))->toBe('hi');
});

test('guest can switch locale via session without db update', function (): void {
    $response = $this->patch('/locale', ['locale' => 'en']);

    $response->assertRedirectBack();
    expect(session('locale'))->toBe('en');
});

test('invalid locale returns validation error', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/locale', ['locale' => 'fr'])
        ->assertSessionHasErrors(['locale']);
});

test('missing locale returns validation error', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/locale', [])
        ->assertSessionHasErrors(['locale']);
});
