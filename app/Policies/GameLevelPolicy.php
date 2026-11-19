<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\GameLevel;
use App\Models\User;

class GameLevelPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, GameLevel $gameLevel): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, GameLevel $gameLevel): bool
    {
        return $user->can('reference_data.manage');
    }
}
