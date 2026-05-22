<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;

class UnitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, Unit $unit): bool
    {
        return $unit->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Unit $unit): bool
    {
        return $unit->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $unit->organization_id === (int) $user->organization_id
            && $user->can('reference_data.manage');
    }
}
