<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\District;
use App\Models\User;

class DistrictPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, District $district): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, District $district): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, District $district): bool
    {
        return $user->can('reference_data.manage');
    }
}
