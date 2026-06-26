<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ExternalCoach;
use App\Models\User;

class ExternalCoachPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('external-coaches.view');
    }

    public function view(User $user, ExternalCoach $externalCoach): bool
    {
        return $user->can('external-coaches.view')
            && (int) $user->organization_id === (int) $externalCoach->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('external-coaches.create');
    }

    public function update(User $user, ExternalCoach $externalCoach): bool
    {
        return $user->can('external-coaches.update')
            && (int) $user->organization_id === (int) $externalCoach->organization_id;
    }

    public function manageStatus(User $user, ExternalCoach $externalCoach): bool
    {
        return $user->can('external-coaches.manageStatus')
            && (int) $user->organization_id === (int) $externalCoach->organization_id;
    }

    public function delete(User $user, ExternalCoach $externalCoach): bool
    {
        return $user->can('external-coaches.delete')
            && (int) $user->organization_id === (int) $externalCoach->organization_id;
    }
}
