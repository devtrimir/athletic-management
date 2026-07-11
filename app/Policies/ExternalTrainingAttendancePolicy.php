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
            && (int) $user->organization_id === (int) $externalTrainingAttendance->organization_id;
    }

    public function reviewDetails(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $user->can('external-training-attendances.review')
            && (int) $user->organization_id === (int) $externalTrainingAttendance->organization_id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $user->can('external-training-attendances.review')
            && (int) $user->organization_id === (int) $externalTrainingAttendance->organization_id
            && $externalTrainingAttendance->review_status !== 'locked';
    }

    public function accept(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $this->update($user, $externalTrainingAttendance)
            && $user->can('external-training-attendances.accept');
    }

    public function reject(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $this->update($user, $externalTrainingAttendance)
            && $user->can('external-training-attendances.reject');
    }

    public function correct(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $this->update($user, $externalTrainingAttendance)
            && $user->can('external-training-attendances.correct');
    }

    public function manualReview(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $this->update($user, $externalTrainingAttendance)
            && $user->can('external-training-attendances.manual-review');
    }

    public function lock(User $user, ExternalTrainingAttendance $externalTrainingAttendance): bool
    {
        return $this->update($user, $externalTrainingAttendance)
            && $user->can('external-training-attendances.lock');
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
