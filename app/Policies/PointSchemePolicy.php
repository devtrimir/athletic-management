<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PointScheme;
use App\Models\User;

class PointSchemePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    /** Only drafts can be changed, published, or deleted; a published version is locked. */
    public function update(User $user, PointScheme $pointScheme): bool
    {
        return $user->can('reference_data.manage') && $pointScheme->status === PointScheme::STATUS_DRAFT;
    }

    public function delete(User $user, PointScheme $pointScheme): bool
    {
        return $this->update($user, $pointScheme);
    }
}
