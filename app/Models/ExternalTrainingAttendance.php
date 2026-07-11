<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\ExternalTrainingAttendanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $external_coaching_assignment_id
 * @property int $member_id
 * @property int $external_coach_id
 * @property int $training_venue_id
 * @property Carbon $attendance_date
 * @property string $attendance_status
 * @property string $review_status
 * @property string $geo_status
 * @property string|null $submitted_photo_path
 * @property string|null $submitted_photo_original_name
 * @property string|null $submitted_photo_mime_type
 * @property int|null $submitted_photo_size_bytes
 * @property Carbon|null $submitted_photo_uploaded_at
 * @property int|null $submitted_photo_width
 * @property int|null $submitted_photo_height
 * @property Carbon $submitted_at
 */
#[Fillable([
    'organization_id',
    'external_coaching_assignment_id',
    'member_id',
    'external_coach_id',
    'training_venue_id',
    'attendance_date',
    'attendance_status',
    'corrected_attendance_status',
    'review_status',
    'reviewed_by',
    'reviewed_at',
    'review_remarks',
    'geo_status',
    'flag_reason',
    'coach_remarks',
    'submitted_at',
    'submitted_latitude',
    'submitted_longitude',
    'submitted_gps_accuracy',
    'distance_from_venue_meters',
    'submitted_photo_path',
    'submitted_photo_original_name',
    'submitted_photo_mime_type',
    'submitted_photo_size_bytes',
    'submitted_photo_uploaded_at',
    'submitted_photo_width',
    'submitted_photo_height',
    'submitted_photo_source',
    'check_in_at',
    'check_in_latitude',
    'check_in_longitude',
    'check_in_gps_accuracy',
    'check_in_photo_path',
    'check_in_distance_from_venue_meters',
    'check_in_geo_status',
    'check_out_at',
    'check_out_latitude',
    'check_out_longitude',
    'check_out_gps_accuracy',
    'check_out_photo_path',
    'check_out_distance_from_venue_meters',
    'check_out_geo_status',
    'duration_minutes',
    'venue_latitude_snapshot',
    'venue_longitude_snapshot',
    'allowed_radius_meters_snapshot',
    'venue_name_snapshot',
    'ip_address',
    'user_agent',
    'device_info',
    'browser_timezone',
    'submitted_source',
])]
#[ObservedBy([AuditObserver::class])]
class ExternalTrainingAttendance extends Model
{
    /** @use HasFactory<ExternalTrainingAttendanceFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'reviewed_at' => 'datetime',
            'submitted_at' => 'datetime',
            'submitted_latitude' => 'decimal:7',
            'submitted_longitude' => 'decimal:7',
            'submitted_gps_accuracy' => 'integer',
            'distance_from_venue_meters' => 'decimal:2',
            'submitted_photo_size_bytes' => 'integer',
            'submitted_photo_uploaded_at' => 'datetime',
            'submitted_photo_width' => 'integer',
            'submitted_photo_height' => 'integer',
            'check_in_at' => 'datetime',
            'check_in_latitude' => 'decimal:7',
            'check_in_longitude' => 'decimal:7',
            'check_in_gps_accuracy' => 'integer',
            'check_in_distance_from_venue_meters' => 'decimal:2',
            'check_out_at' => 'datetime',
            'check_out_latitude' => 'decimal:7',
            'check_out_longitude' => 'decimal:7',
            'check_out_gps_accuracy' => 'integer',
            'check_out_distance_from_venue_meters' => 'decimal:2',
            'duration_minutes' => 'integer',
            'venue_latitude_snapshot' => 'decimal:7',
            'venue_longitude_snapshot' => 'decimal:7',
            'allowed_radius_meters_snapshot' => 'integer',
            'device_info' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<ExternalCoachingAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ExternalCoachingAssignment::class, 'external_coaching_assignment_id');
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

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
