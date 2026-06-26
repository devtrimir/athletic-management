<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ExternalTrainingAttendance;
use App\Models\User;

class ExternalTrainingAttendancePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('external-training-attendances.view');
    }

    public function view(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $user->can('external-training-attendances.view')
            && $user->organization_id === $externalTrainingAttendance->organization_id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $user->can('external-training-attendances.review')
            && $user->organization_id === $externalTrainingAttendance->organization_id
            && $externalTrainingAttendance->review_status !== 'locked';
    }

    public function delete(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return false;
    }

    public function restore(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return false;
    }

    public function forceDelete(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return false;
    }
}
