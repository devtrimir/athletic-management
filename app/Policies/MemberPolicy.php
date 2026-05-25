<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class MemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('members.view');
    }

    public function view(User $user, mixed $member): bool
    {
        return $user->can('members.view');
    }

    public function create(User $user): bool
    {
        return $user->can('members.create');
    }

    public function update(User $user, mixed $member): bool
    {
        return $user->can('members.update');
    }

    public function delete(User $user, mixed $member): bool
    {
        return $user->can('members.delete');
    }

    public function restore(User $user, mixed $member): bool
    {
        return $user->can('members.restore');
    }

    public function changeStatus(User $user, mixed $member): bool
    {
        return $user->can('members.changeStatus');
    }

    public function manageAlias(User $user, mixed $member): bool
    {
        return $user->can('members.manageAlias');
    }

    public function manageLegacyAchievements(User $user, mixed $member): bool
    {
        return $user->can('members.manageLegacyAchievements');
    }

    public function manageBenefits(User $user, mixed $member): bool
    {
        return $user->can('members.manageBenefits');
    }
}
