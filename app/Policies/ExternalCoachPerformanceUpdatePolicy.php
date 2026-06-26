<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\User;

class ExternalCoachPerformanceUpdatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('external-coach-performance-updates.view');
    }

    public function view(User $user, ExternalCoachPerformanceUpdate $externalCoachPerformanceUpdate): bool
    {
        return $user->can('external-coach-performance-updates.view')
            && $user->organization_id === $externalCoachPerformanceUpdate->organization_id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ExternalCoachPerformanceUpdate $externalCoachPerformanceUpdate): bool
    {
        return $user->can('external-coach-performance-updates.review')
            && $user->organization_id === $externalCoachPerformanceUpdate->organization_id
            && $externalCoachPerformanceUpdate->review_status !== 'locked';
    }

    public function delete(User $user, ExternalCoachPerformanceUpdate $externalCoachPerformanceUpdate): bool
    {
        return false;
    }

    public function restore(User $user, ExternalCoachPerformanceUpdate $externalCoachPerformanceUpdate): bool
    {
        return false;
    }

    public function forceDelete(User $user, ExternalCoachPerformanceUpdate $externalCoachPerformanceUpdate): bool
    {
        return false;
    }
}
