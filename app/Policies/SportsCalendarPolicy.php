<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SportsCalendar;
use App\Models\User;

class SportsCalendarPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('sports-calendars.view');
    }

    public function view(User $user, SportsCalendar $sportsCalendar): bool
    {
        return $user->can('sports-calendars.view')
            && (int) $user->organization_id === (int) $sportsCalendar->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->can('sports-calendars.create');
    }

    public function update(User $user, SportsCalendar $sportsCalendar): bool
    {
        return $user->can('sports-calendars.update')
            && (int) $user->organization_id === (int) $sportsCalendar->organization_id;
    }
}
