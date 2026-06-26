<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ExternalCoachingAssignment;
use App\Models\User;

class ExternalCoachingAssignmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('external-coaching-assignments.view');
    }

    public function view(User $user, ExternalCoachingAssignment $assignment): bool
    {
        return $user->can('external-coaching-assignments.view')
            && (int) $user->organization_id === (int) $assignment->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('external-coaching-assignments.create');
    }

    public function update(User $user, ExternalCoachingAssignment $assignment): bool
    {
        return $user->can('external-coaching-assignments.update')
            && (int) $user->organization_id === (int) $assignment->organization_id;
    }

    public function delete(User $user, ExternalCoachingAssignment $assignment): bool
    {
        return $user->can('external-coaching-assignments.delete')
            && (int) $user->organization_id === (int) $assignment->organization_id;
    }
}
