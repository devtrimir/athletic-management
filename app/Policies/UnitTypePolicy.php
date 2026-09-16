<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\UnitType;
use App\Models\User;

class UnitTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, UnitType $unitType): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, UnitType $unitType): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, UnitType $unitType): bool
    {
        return $user->can('reference_data.manage');
    }
}
