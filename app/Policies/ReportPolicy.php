<?php

declare(strict_types=1);

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

    public function export(User $user, mixed $report): bool
    {
        return $user->can('reports.view');
    }
}
