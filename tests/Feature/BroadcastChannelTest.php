<?php

declare(strict_types=1);

// Channel authorization is only evaluated by real protocol broadcasters — the
// log/null drivers used elsewhere in the test suite no-op on auth. The pusher
// driver generates its auth signature locally, so no network is involved.
beforeEach(function () {
    config()->set('broadcasting.default', 'pusher');
    config()->set('broadcasting.connections.pusher.key', 'test-key');
    config()->set('broadcasting.connections.pusher.secret', 'test-secret');
    config()->set('broadcasting.connections.pusher.app_id', 'test-app');
    require base_path('routes/channels.php');
});

test('a user can subscribe to their own organization broadcast channel', function () {
    $user = rcUser();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-organization.'.$user->organization_id,
    ])->assertSuccessful();
});

test('a user cannot subscribe to another organizations broadcast channel', function () {
    $user = rcUser();
    $other = rcUser();

    $this->actingAs($user)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-organization.'.$other->organization_id,
    ])->assertForbidden();
});
