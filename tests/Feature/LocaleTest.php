<?php

test('patch locale sets hindi in session', function (): void {
    $this->patch('/locale', ['locale' => 'hi'])
        ->assertRedirect();

    expect(session('locale'))->toBe('hi');
});

test('patch locale sets english in session', function (): void {
    $this->patch('/locale', ['locale' => 'en'])
        ->assertRedirect();

    expect(session('locale'))->toBe('en');
});

test('patch locale rejects unsupported locale', function (): void {
    $this->patch('/locale', ['locale' => 'fr'])
        ->assertInvalid(['locale']);
});

test('set locale middleware defaults to hindi', function (): void {
    $this->withSession([])->get('/');

    expect(app()->getLocale())->toBe('hi');
});
