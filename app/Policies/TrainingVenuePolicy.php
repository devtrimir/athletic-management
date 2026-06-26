<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\TrainingVenue;
use App\Models\User;

class TrainingVenuePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('training-venues.view');
    }

    public function view(User $user, TrainingVenue $trainingVenue): bool
    {
        return $user->can('training-venues.view')
            && (int) $user->organization_id === (int) $trainingVenue->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('training-venues.create');
    }

    public function update(User $user, TrainingVenue $trainingVenue): bool
    {
        return $user->can('training-venues.update')
            && (int) $user->organization_id === (int) $trainingVenue->organization_id;
    }

    public function delete(User $user, TrainingVenue $trainingVenue): bool
    {
        return $user->can('training-venues.delete')
            && (int) $user->organization_id === (int) $trainingVenue->organization_id;
    }
}
