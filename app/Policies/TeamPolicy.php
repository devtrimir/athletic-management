<?php

namespace App\Policies;

use App\Models\User;

class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('teams.view');
    }

    public function view(User $user, mixed $team): bool
    {
        return $user->can('teams.view');
    }

    public function create(User $user): bool
    {
        return $user->can('teams.create');
    }

    public function update(User $user, mixed $team): bool
    {
        return $user->can('teams.update');
    }

    public function delete(User $user, mixed $team): bool
    {
        return $user->can('teams.delete');
    }
}
