<?php

use App\Models\User;

// In non-local environments Horizon returns 403 directly (no redirect to login)
// because the gate check fires before auth middleware in Horizon's route stack.

test('horizon dashboard is forbidden to guests in non-local env', function () {
    $this->get('/horizon')->assertForbidden();
});

test('horizon dashboard is forbidden to authenticated users in non-local env', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/horizon')->assertForbidden();
});
