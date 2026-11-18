<?php

use App\Models\ExternalCoach;
use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

test('login screen points to the inline form on the welcome page', function () {
    $this->get(route('login'))
        ->assertRedirect(route('home', ['panel' => 'user']));

    $this->get(route('home', ['panel' => 'user']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('welcome')->where('panel', 'user'));

    $this->get(route('home', ['panel' => 'bogus']))
        ->assertInertia(fn ($page) => $page->where('panel', null));
});

test('signed-in users never get a login form on the welcome page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('home', ['panel' => 'user']))
        ->assertInertia(fn ($page) => $page->where('panel', null)->where('signedInAs', 'user'));

    $this->actingAs($user)->get(route('login'))->assertRedirect(route('dashboard'));
});

test('a signed-in external coach is pointed to the coach dashboard instead of a form', function () {
    $coach = ExternalCoach::factory()->create(['status' => 'active']);

    $this->actingAs($coach, 'external_coach')
        ->get(route('home', ['panel' => 'coach']))
        ->assertInertia(fn ($page) => $page->where('panel', null)->where('signedInAs', 'coach'));

    $this->actingAs($coach, 'external_coach')
        ->get(route('external-coach.login'))
        ->assertRedirect(route('external-coach.dashboard'));
});

test('a failed login from the welcome page returns there with the error', function () {
    $user = User::factory()->create();

    $this->from(route('home', ['panel' => 'user']))
        ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertRedirect(route('home', ['panel' => 'user']))
        ->assertSessionHasErrors('email');
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->withTwoFactor()->create();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $response->assertRedirect(route('home'));

    $this->assertGuest();
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
