<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class CoachPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('coaches.view');
    }

    public function view(User $user, mixed $coach): bool
    {
        return $user->can('coaches.view');
    }

    public function create(User $user): bool
    {
        return $user->can('coaches.create');
    }

    public function update(User $user, mixed $coach): bool
    {
        return $user->can('coaches.update');
    }

    public function delete(User $user, mixed $coach): bool
    {
        return $user->can('coaches.delete');
    }

    public function restore(User $user, mixed $coach): bool
    {
        return $user->can('coaches.restore');
    }
}
