<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\MediaFile;
use App\Models\User;

class MediaPolicy
{
    public function upload(User $user): bool
    {
        return $user->can('media.upload');
    }

    public function delete(User $user, MediaFile $mediaFile): bool
    {
        return $user->can('media.delete');
    }
}
