<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Collections\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $member_id
 * @property string $full_name
 * @property string|null $pno
 * @property string|null $mobile
 * @property string|null $display_name
 * @property string|null $designation
 * @property string|null $email
 * @property string|null $gender
 * @property Carbon|null $date_of_birth
 * @property string $coach_status
 * @property string|null $bio
 * @property string|null $address
 * @property string|null $photo_path
 * @property bool $nis_certified
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Member|null $member
 * @property-read Collection<int, CoachCertification> $certifications
 * @property-read Collection<int, Sport> $sports
 * @property-read Collection<int, CoachAssignment> $assignmentHistory
 * @property-read Collection<int, CoachAssignment> $currentAssignments
 * @property-read CoachAssignment|null $currentAssignment
 */
#[Fillable([
    'organization_id',
    'member_id',
    'full_name',
    'pno',
    'mobile',
    'nis_certified',
    'display_name',
    'designation',
    'email',
    'gender',
    'date_of_birth',
    'coach_status',
    'bio',
    'address',
    'photo_path',
])]
#[ObservedBy([AuditObserver::class])]
class Coach extends Model
{
    /** @use HasFactory<CoachFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nis_certified' => 'boolean',
            'date_of_birth' => 'date',
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

    /** @return HasMany<CoachCertification, $this> */
    public function certifications(): HasMany
    {
        return $this->hasMany(CoachCertification::class);
    }

    /** @return BelongsToMany<Sport, $this> */
    public function sports(): BelongsToMany
    {
        return $this->belongsToMany(Sport::class, 'coach_sport')
            ->using(CoachSport::class)
            ->withPivot(['is_primary', 'level', 'effective_from', 'effective_to', 'notes'])
            ->withTimestamps();
    }

    /** @return HasMany<CoachAssignment, $this> */
    public function assignmentHistory(): HasMany
    {
        return $this->hasMany(CoachAssignment::class);
    }

    /** @return HasMany<CoachAssignment, $this> */
    public function currentAssignments(): HasMany
    {
        return $this->hasMany(CoachAssignment::class)->current();
    }

    /** @return HasOne<CoachAssignment, $this> */
    public function currentAssignment(): HasOne
    {
        return $this->hasOne(CoachAssignment::class)
            ->current()
            ->latest('assigned_at')
            ->latest('id');
    }

    public function getDisplayNameAttribute(): string
    {
        return ($this->attributes['display_name'] ?? null) ?: $this->full_name;
    }

    public function getProfileStatusBadgeAttribute(): string
    {
        return match ($this->coach_status) {
            'ACTIVE' => 'Active',
            'INACTIVE' => 'Inactive',
            'RETIRED' => 'Retired',
            default => 'Unknown',
        };
    }

    public function getActiveAssignmentAttribute(): ?CoachAssignment
    {
        return $this->currentAssignment;
    }
}
