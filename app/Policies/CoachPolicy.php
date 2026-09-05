<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class CoachPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('coaches.view');
    }

    public function view(User $user, mixed $coach): bool
    {
        return $user->can('coaches.view');
    }

    public function create(User $user): bool
    {
        return $user->can('coaches.create');
    }

    public function update(User $user, mixed $coach): bool
    {
        return $user->can('coaches.update');
    }

    public function updateProfile(User $user, mixed $coach): bool
    {
        return $user->can('coaches.update');
    }

    public function updateAssignments(User $user, mixed $coach): bool
    {
        return $user->can('coaches.manageTeamAssignments') || $user->can('coaches.update');
    }

    public function updateCertifications(User $user, mixed $coach): bool
    {
        return $user->can('coaches.manageCertifications') || $user->can('coaches.update');
    }

    public function updateSports(User $user, mixed $coach): bool
    {
        return $user->can('coaches.manageSports') || $user->can('coaches.update');
    }

    public function managePromotions(User $user, mixed $coach): bool
    {
        return $user->can('coaches.managePromotions') || $user->can('coaches.update');
    }

    public function manageAlias(User $user, mixed $coach): bool
    {
        return $user->can('coaches.update');
    }

    public function manageStatus(User $user, mixed $coach): bool
    {
        return $user->can('coaches.manageStatus') || $user->can('coaches.update');
    }

    public function manageSpecialAchievements(User $user, mixed $coach): bool
    {
        return $user->can('coaches.manageSpecialAchievements') || $user->can('coaches.update');
    }

    public function managePlayingAchievements(User $user, mixed $coach): bool
    {
        return $user->can('coaches.managePlayingAchievements') || $user->can('coaches.update');
    }

    public function uploadMedia(User $user, mixed $coach): bool
    {
        return $user->can('coaches.uploadMedia') || $user->can('coaches.update') || $user->can('media.upload');
    }

    public function deleteMedia(User $user, mixed $coach): bool
    {
        return $user->can('coaches.deleteMedia') || $user->can('coaches.update') || $user->can('media.delete');
    }

    public function viewAuditLog(User $user, mixed $coach): bool
    {
        return $user->can('coaches.viewAuditLog') || $user->can('coaches.view');
    }

    public function delete(User $user, mixed $coach): bool
    {
        return $user->can('coaches.delete');
    }

    public function restore(User $user, mixed $coach): bool
    {
        return $user->can('coaches.restore');
    }
}
