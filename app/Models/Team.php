<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $sport_id
 * @property int $session_id
 * @property string $location_type
 * @property int|null $district_id
 * @property int|null $unit_id
 * @property string $name
 * @property string|null $in_charge
 * @property bool $is_active
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Sport $sport
 * @property-read SportSession $session
 * @property-read District|null $district
 * @property-read Unit|null $unit
 * @property-read int|null $team_members_count
 * @property-read int|null $coach_assignments_count
 * @property-read int|null $team_member_movements_count
 * @property-read int|null $session_statuses_count
 */
#[Fillable([
    'organization_id',
    'sport_id',
    'session_id',
    'location_type',
    'district_id',
    'unit_id',
    'name',
    'in_charge',
    'is_active',
])]
#[ObservedBy([AuditObserver::class])]
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    protected $appends = ['location_name', 'location_label'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @return BelongsTo<District, $this> */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return HasMany<TeamMember, $this> */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    /** @return HasMany<TeamMemberMovement, $this> */
    public function teamMemberMovements(): HasMany
    {
        return $this->hasMany(TeamMemberMovement::class);
    }

    /** @return HasMany<TeamSessionStatus, $this> */
    public function sessionStatuses(): HasMany
    {
        return $this->hasMany(TeamSessionStatus::class);
    }

    /** @return HasMany<CoachAssignment, $this> */
    public function coachAssignments(): HasMany
    {
        return $this->hasMany(CoachAssignment::class);
    }

    /** @return HasMany<TeamInchargeAssignment, $this> */
    public function inchargeAssignments(): HasMany
    {
        return $this->hasMany(TeamInchargeAssignment::class)->latest('assigned_at');
    }

    /** @return HasOne<TeamInchargeAssignment, $this> */
    public function currentInchargeAssignment(): HasOne
    {
        return $this->hasOne(TeamInchargeAssignment::class)
            ->where('is_current', true)
            ->latestOfMany('assigned_at');
    }

    /** @return HasMany<TeamInchargeAssignment, $this> */
    public function inchargeHistory(): HasMany
    {
        return $this->hasMany(TeamInchargeAssignment::class)
            ->where('is_current', false)
            ->latest('assigned_at');
    }

    /** @param  Builder<Team>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @param  Builder<Team>  $query */
    public function scopeInactive(Builder $query): void
    {
        $query->where('is_active', false);
    }

    /** @param  Builder<Team>  $query */
    public function scopeByDistrict(Builder $query, int $districtId): void
    {
        $query->where('district_id', $districtId);
    }

    /** @param  Builder<Team>  $query */
    public function scopeByUnit(Builder $query, int $unitId): void
    {
        $query->where('unit_id', $unitId);
    }

    /** @param  Builder<Team>  $query */
    public function scopeByLocationType(Builder $query, string $type): void
    {
        $query->where('location_type', $type);
    }

    protected function locationName(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->location_type === 'unit'
                ? $this->unit?->name
                : $this->district?->name,
        );
    }

    protected function locationLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => match ($this->location_type) {
                'unit' => collect([$this->unit?->name, $this->district?->name])
                    ->filter()
                    ->join(', '),
                'district' => $this->district?->name,
                default => null,
            },
        );
    }

    protected function currentInchargeName(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->currentInchargeAssignment?->full_name ?? $this->in_charge,
        );
    }

    protected function currentInchargePno(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->currentInchargeAssignment?->pno,
        );
    }

    protected function currentInchargeDesignation(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->currentInchargeAssignment?->designation,
        );
    }

    protected function currentInchargeMobile(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->currentInchargeAssignment?->mobile,
        );
    }

    protected function currentInchargeSince(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->currentInchargeAssignment?->assigned_at?->toDateTimeString(),
        );
    }

    protected function hasCurrentIncharge(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->currentInchargeAssignment !== null,
        );
    }
}
