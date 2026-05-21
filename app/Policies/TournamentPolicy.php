<?php

namespace App\Policies;

use App\Models\User;

class TournamentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tournaments.view');
    }

    public function view(User $user, mixed $tournament): bool
    {
        return $user->can('tournaments.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tournaments.create');
    }

    public function update(User $user, mixed $tournament): bool
    {
        return $user->can('tournaments.update');
    }

    public function delete(User $user, mixed $tournament): bool
    {
        return $user->can('tournaments.delete');
    }
}
