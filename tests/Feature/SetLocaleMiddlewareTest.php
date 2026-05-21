<?php

use App\Http\Middleware\SetLocale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

uses(RefreshDatabase::class);

function runMiddleware(Request $request): void
{
    (new SetLocale)->handle($request, fn () => new Response);
}

test('authenticated user locale is read from users.locale', function (): void {
    $user = User::factory()->create(['locale' => 'en']);

    $request = Request::create('/');
    $request->setUserResolver(fn () => $user);

    runMiddleware($request);

    expect(app()->getLocale())->toBe('en');
});

test('authenticated user with hi locale sets hi', function (): void {
    $user = User::factory()->create(['locale' => 'hi']);

    $request = Request::create('/');
    $request->setUserResolver(fn () => $user);

    runMiddleware($request);

    expect(app()->getLocale())->toBe('hi');
});

test('guest with session locale en sets en', function (): void {
    $store = app('session.store');
    $store->put('locale', 'en');

    $request = Request::create('/');
    $request->setLaravelSession($store);

    runMiddleware($request);

    expect(app()->getLocale())->toBe('en');
});

test('guest with no session defaults to hi', function (): void {
    $request = Request::create('/');

    runMiddleware($request);

    expect(app()->getLocale())->toBe('hi');
});

test('unrecognised locale value is normalised to hi', function (): void {
    // Use an anonymous object to avoid the DB CHECK constraint on users.locale.
    $fakeUser = new class
    {
        public string $locale = 'fr';
    };

    $request = Request::create('/');
    $request->setUserResolver(fn () => $fakeUser);

    runMiddleware($request);

    expect(app()->getLocale())->toBe('hi');
});
