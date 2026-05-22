<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SportSession;
use App\Models\User;

class SportSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, SportSession $sportSession): bool
    {
        return $sportSession->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, SportSession $sportSession): bool
    {
        return $sportSession->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function delete(User $user, SportSession $sportSession): bool
    {
        return $sportSession->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }
}
