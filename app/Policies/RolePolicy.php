<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function view(User $user, Role $role): bool
    {
        return $role->organization_id === (int) $user->organization_id
            && $user->can('users.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function update(User $user, Role $role): bool
    {
        // System roles cannot be edited.
        return $role->organization_id === (int) $user->organization_id
            && $user->can('users.manage')
            && ! $role->is_system;
    }

    public function delete(User $user, Role $role): bool
    {
        // System roles cannot be deleted.
        return $role->organization_id === (int) $user->organization_id
            && $user->can('users.manage')
            && ! $role->is_system;
    }

    public function updatePermissions(User $user, Role $role): bool
    {
        return $role->organization_id === (int) $user->organization_id
            && $user->can('users.manage');
    }
}
