<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Designation;
use App\Models\User;

class DesignationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, Designation $designation): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Designation $designation): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, Designation $designation): bool
    {
        return $user->can('reference_data.manage');
    }
}
