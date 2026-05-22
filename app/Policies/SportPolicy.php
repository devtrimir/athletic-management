<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Sport;
use App\Models\User;

class SportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, Sport $sport): bool
    {
        return $sport->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Sport $sport): bool
    {
        return $sport->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function delete(User $user, Sport $sport): bool
    {
        return $sport->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }
}
