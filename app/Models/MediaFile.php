<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\MediaFileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $mediable_type
 * @property int $mediable_id
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size_bytes
 * @property string|null $caption_hi
 * @property int $uploaded_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Participation|Achievement $mediable
 * @property-read User $uploader
 */
#[Fillable([
    'organization_id',
    'mediable_type',
    'mediable_id',
    'disk',
    'path',
    'original_name',
    'mime_type',
    'size_bytes',
    'caption_hi',
    'uploaded_by',
])]
#[ObservedBy([AuditObserver::class])]
class MediaFile extends Model
{
    /** @use HasFactory<MediaFileFactory> */
    use Auditable, HasFactory, Tenanted;

    /** @return MorphTo<Model, $this> */
    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Absolute public URL to the stored file.
     */
    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }
}
