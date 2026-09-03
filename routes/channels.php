<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return $user->id === $id;
});

Broadcast::channel('organization.{organizationId}', function (User $user, int $organizationId) {
    return $user->organization_id === $organizationId;
});
