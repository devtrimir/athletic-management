<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\ExternalCoachingAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $member_id
 * @property int $external_coach_id
 * @property int $training_venue_id
 * @property int $sport_id
 * @property int|null $sport_event_id
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property array<int, string>|null $training_days
 * @property string $attendance_mode
 * @property string $status
 * @property string|null $permission_document_path
 * @property string|null $permission_document_original_name
 * @property string|null $permission_document_mime_type
 * @property int|null $permission_document_size_bytes
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable([
    'organization_id',
    'member_id',
    'external_coach_id',
    'training_venue_id',
    'sport_id',
    'sport_event_id',
    'start_date',
    'end_date',
    'training_days',
    'training_start_time',
    'training_end_time',
    'attendance_mode',
    'permission_reference_number',
    'permission_document_path',
    'permission_document_original_name',
    'permission_document_mime_type',
    'permission_document_size_bytes',
    'approved_by',
    'approved_at',
    'status',
    'cancellation_reason',
    'completion_remarks',
    'remarks',
    'created_by',
    'updated_by',
])]
#[ObservedBy([AuditObserver::class])]
class ExternalCoachingAssignment extends Model
{
    /** @use HasFactory<ExternalCoachingAssignmentFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'training_days' => 'array',
            'approved_at' => 'datetime',
            'permission_document_size_bytes' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<ExternalCoach, $this> */
    public function externalCoach(): BelongsTo
    {
        return $this->belongsTo(ExternalCoach::class);
    }

    /** @return BelongsTo<TrainingVenue, $this> */
    public function trainingVenue(): BelongsTo
    {
        return $this->belongsTo(TrainingVenue::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<SportEvent, $this> */
    public function sportEvent(): BelongsTo
    {
        return $this->belongsTo(SportEvent::class);
    }

    /** @return HasMany<ExternalTrainingAttendance, $this> */
    public function attendances(): HasMany
    {
        return $this->hasMany(ExternalTrainingAttendance::class);
    }

    /** @return HasMany<ExternalCoachPerformanceUpdate, $this> */
    public function performanceUpdates(): HasMany
    {
        return $this->hasMany(ExternalCoachPerformanceUpdate::class);
    }
}
