<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function view(User $user, User $model): bool
    {
        return $model->organization_id === (int) $user->organization_id
            && $user->can('users.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function update(User $user, User $model): bool
    {
        return $model->organization_id === (int) $user->organization_id
            && $user->can('users.manage');
    }

    public function delete(User $user, User $model): bool
    {
        // Cannot delete yourself.
        return $model->organization_id === (int) $user->organization_id
            && $user->can('users.manage')
            && $user->id !== $model->id;
    }

    public function updateRoles(User $user, User $model): bool
    {
        return $model->organization_id === (int) $user->organization_id
            && $user->can('users.manage');
    }
}
