<?php

namespace App\Policies;

use App\Models\User;

class ReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reports.view');
    }

    public function view(User $user, mixed $report): bool
    {
        return $user->can('reports.view');
    }
}
