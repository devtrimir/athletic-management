<?php

namespace App\Policies;

use App\Models\User;

class ImportPolicy
{
    public function create(User $user): bool
    {
        return $user->can('imports.run');
    }
}
