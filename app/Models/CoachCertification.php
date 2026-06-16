<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use Database\Factories\CoachCertificationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $coach_id
 * @property string $name
 * @property string|null $certificate_type
 * @property string|null $issuer
 * @property Carbon|null $issued_at
 * @property Carbon|null $expired_at
 * @property string|null $attachment_path
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 */
#[Fillable([
    'coach_id',
    'name',
    'certificate_type',
    'issuer',
    'issued_at',
    'expired_at',
    'attachment_path',
    'metadata',
])]
class CoachCertification extends Model
{
    /** @use HasFactory<CoachCertificationFactory> */
    use Auditable, HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'expired_at' => 'date',
            'metadata' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }
}
