<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Rank;
use App\Models\User;

class RankPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, Rank $rank): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Rank $rank): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, Rank $rank): bool
    {
        return $user->can('reference_data.manage');
    }
}
