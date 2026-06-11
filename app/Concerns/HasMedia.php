<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Models\MediaFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Adds media relationship to models that can own uploaded images.
 *
 * Supported mediable types: Participation, Achievement, MemberPromotion.
 *
 * @mixin Model
 */
trait HasMedia
{
    /** @return MorphMany<MediaFile, $this> */
    public function media(): MorphMany
    {
        return $this->morphMany(MediaFile::class, 'mediable')->orderBy('created_at');
    }
}
