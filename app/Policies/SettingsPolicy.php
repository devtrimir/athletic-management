<?php

namespace App\Policies;

use App\Models\User;

class SettingsPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('settings.manage');
    }

    public function update(User $user, mixed $settings): bool
    {
        return $user->can('settings.manage');
    }
}
