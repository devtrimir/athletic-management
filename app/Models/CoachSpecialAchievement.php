<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachSpecialAchievementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Standalone special achievement or departmental recognition for a coach.
 * These records are not linked to medals, legacy achievements, or achievement benefits.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $coach_id
 * @property string $achievement_type
 * @property string $title
 * @property Carbon|null $awarded_on
 * @property string|null $issuing_authority
 * @property string|null $order_reference
 * @property string|null $order_document_path
 * @property string|null $order_document_original_name
 * @property string|null $order_document_mime_type
 * @property int|null $order_document_size_bytes
 * @property string|null $place
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read Organization $organization
 */
#[Fillable([
    'organization_id',
    'coach_id',
    'achievement_type',
    'title',
    'awarded_on',
    'issuingAuthority',
    'order_reference',
    'order_document_path',
    'order_document_original_name',
    'order_document_mime_type',
    'order_document_size_bytes',
    'place',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class CoachSpecialAchievement extends Model
{
    /** @use HasFactory<CoachSpecialAchievementFactory> */
    use Auditable, HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'awarded_on' => 'date',
            'order_document_size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
