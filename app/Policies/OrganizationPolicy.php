<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function view(User $user, Organization $organization): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->can('reference_data.manage');
    }
}
