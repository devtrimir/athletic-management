<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ExternalCoachDocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $external_coach_id
 * @property string $type
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size_bytes
 * @property int|null $uploaded_by
 */
#[Fillable(['external_coach_id', 'type', 'path', 'original_name', 'mime_type', 'size_bytes', 'uploaded_by'])]
class ExternalCoachDocument extends Model
{
    /** @use HasFactory<ExternalCoachDocumentFactory> */
    use HasFactory;

    /** @var list<string> */
    public const TYPES = ['aadhaar', 'pan', 'certificate', 'police_verification', 'other'];

    /** @return BelongsTo<ExternalCoach, $this> */
    public function externalCoach(): BelongsTo
    {
        return $this->belongsTo(ExternalCoach::class);
    }
}
