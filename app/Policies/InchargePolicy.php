<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class InchargePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('incharges.view');
    }

    public function view(User $user, mixed $incharge): bool
    {
        return $user->can('incharges.view');
    }

    public function create(User $user): bool
    {
        return $user->can('incharges.create');
    }

    public function update(User $user, mixed $incharge): bool
    {
        return $user->can('incharges.update');
    }

    public function manageSpecialAchievements(User $user, mixed $incharge): bool
    {
        return $user->can('incharges.manageSpecialAchievements') || $user->can('incharges.update');
    }

    public function delete(User $user, mixed $incharge): bool
    {
        return $user->can('incharges.delete');
    }
}
