<?php

test('post locale sets hindi in session', function (): void {
    $this->post('/locale', ['locale' => 'hi'])
        ->assertRedirect();

    expect(session('locale'))->toBe('hi');
});

test('post locale sets english in session', function (): void {
    $this->post('/locale', ['locale' => 'en'])
        ->assertRedirect();

    expect(session('locale'))->toBe('en');
});

test('post locale rejects unsupported locale', function (): void {
    $this->post('/locale', ['locale' => 'fr'])
        ->assertInvalid(['locale']);
});

test('set locale middleware defaults to hindi', function (): void {
    $this->withSession([])->get('/');

    expect(app()->getLocale())->toBe('hi');
});
