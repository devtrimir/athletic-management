<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\TournamentTier;
use App\Models\User;

class TournamentTierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function view(User $user, TournamentTier $tournamentTier): bool
    {
        return $user->can('reference_data.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('reference_data.manage');
    }

    public function update(User $user, TournamentTier $tournamentTier): bool
    {
        return $user->can('reference_data.manage');
    }

    public function delete(User $user, TournamentTier $tournamentTier): bool
    {
        return $user->can('reference_data.manage');
    }
}
