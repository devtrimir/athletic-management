<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
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
 * @property string|null $blood_group
 * @property string|null $display_name
 * @property string|null $email
 * @property string|null $gender
 * @property Carbon|null $date_of_birth
 * @property string $coach_status
 * @property string|null $bio
 * @property string|null $address
 * @property string|null $photo_path
 * @property int|null $district_id
 * @property int|null $unit_id
 * @property int|null $nis_master_id
 * @property int|null $tier_master_id
 * @property int|null $rank_master_id
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Member|null $member
 * @property-read Collection<int, CoachAlias> $aliases
 * @property-read Collection<int, CoachStatusHistory> $statusHistory
 * @property-read Collection<int, CoachCertification> $certifications
 * @property-read Collection<int, CoachPromotion> $promotions
 * @property-read Collection<int, Sport> $sports
 * @property-read Collection<int, CoachAssignment> $assignmentHistory
 * @property-read Collection<int, CoachAssignment> $currentAssignments
 * @property-read CoachAssignment|null $currentAssignment
 */
#[Fillable([
    'organization_id',
    'member_id',
    'full_name',
    'full_name_en',
    'pno',
    'mobile',
    'blood_group',
    'district_id',
    'unit_id',
    'nis_master_id',
    'tier_master_id',
    'rank_master_id',
    'display_name',
    'display_name_en',
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
            'date_of_birth' => 'date',
            'deleted_at' => 'datetime',
        ];
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function nisMaster(): BelongsTo
    {
        return $this->belongsTo(NisMaster::class, 'nis_master_id');
    }

    public function tierMaster(): BelongsTo
    {
        return $this->belongsTo(TournamentTier::class, 'tier_master_id');
    }

    public function rankMaster(): BelongsTo
    {
        return $this->belongsTo(Rank::class, 'rank_master_id');
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

    /** @return HasMany<CoachAlias, $this> */
    public function aliases(): HasMany
    {
        return $this->hasMany(CoachAlias::class);
    }

    /** @return HasMany<CoachStatusHistory, $this> */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(CoachStatusHistory::class);
    }

    /** @return HasMany<CoachCertification, $this> */
    public function certifications(): HasMany
    {
        return $this->hasMany(CoachCertification::class);
    }

    /** @return HasMany<CoachPromotion, $this> */
    public function promotions(): HasMany
    {
        return $this->hasMany(CoachPromotion::class);
    }

    /** @return HasMany<CoachSpecialAchievement, $this> */
    public function specialAchievements(): HasMany
    {
        return $this->hasMany(CoachSpecialAchievement::class)->latest('awarded_on')->latest('id');
    }

    /** @return HasMany<CoachPlayingAchievement, $this> */
    public function playingAchievements(): HasMany
    {
        return $this->hasMany(CoachPlayingAchievement::class)->latest('achieved_on')->latest('id');
    }

    /** @return BelongsToMany<Sport, $this> */
    public function sports(): BelongsToMany
    {
        return $this->belongsToMany(Sport::class, 'coach_sport')
            ->using(CoachSport::class)
            ->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes'])
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

    /** @return HasMany<CoachAssignment, $this> */
    public function activeCurrentSessionAssignments(): HasMany
    {
        return $this->currentAssignments()
            ->whereHas('team', fn (Builder $query) => $query
                ->where('is_active', true)
                ->whereHas('session', fn (Builder $sessionQuery) => $sessionQuery->where('is_current', true)));
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
            'TRANSFERRED' => 'Transferred',
            'RESIGNED' => 'Resigned',
            'DISMISSED' => 'Dismissed',
            'DECEASED' => 'Deceased',
            'SUSPENDED' => 'Suspended',
            default => 'Unknown',
        };
    }

    public function getActiveAssignmentAttribute(): ?CoachAssignment
    {
        return $this->currentAssignment;
    }

    public function hasActiveCurrentSessionTeamAssignment(): bool
    {
        return $this->activeCurrentSessionAssignments()->exists();
    }
}
