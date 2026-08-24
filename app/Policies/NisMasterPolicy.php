<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\NisMaster;
use App\Models\User;

class NisMasterPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, NisMaster $nisMaster): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, NisMaster $nisMaster): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, NisMaster $nisMaster): bool
    {
        return $user->can('reference_data.manage');
    }
}
