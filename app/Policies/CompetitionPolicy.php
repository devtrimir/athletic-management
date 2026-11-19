<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Competition;
use App\Models\User;

class CompetitionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Competition $competition): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, Competition $competition): bool
    {
        return $user->can('reference_data.manage');
    }
}
