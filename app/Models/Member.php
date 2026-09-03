<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\MemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $member_code
 * @property string|null $pno
 * @property string $full_name
 * @property string|null $full_name
 * @property string|null $full_name_normalized
 * @property string|null $father_name
 * @property string|null $rank
 * @property string|null $initial_rank
 * @property string|null $designation
 * @property string $gender
 * @property Carbon|null $dob
 * @property Carbon|null $joining_date
 * @property string|null $mobile
 * @property int|null $home_district_id
 * @property int|null $posting_district_id
 * @property int|null $current_unit_id
 * @property string $player_category
 * @property string $player_level
 * @property string $current_status
 * @property array<mixed>|null $source_refs
 * @property string|null $photo_path
 * @property string|null $blood_group
 * @property string|null $caste
 * @property Carbon|null $promotion_date
 * @property string|null $appointment
 * @property string|null $home_address
 * @property string|null $recruitment_type
 * @property int|null $sport_id
 * @property string|null $sport_event
 * @property string|null $other_notes
 * @property Carbon|null $team_since
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read District|null $homeDistrict
 * @property-read District|null $postingDistrict
 * @property-read Unit|null $currentUnit
 * @property-read Collection<int, Sport> $playableSports
 * @property-read Collection<int, MemberSpecialAchievement> $specialAchievements
 */
#[Fillable([
    'organization_id',
    'member_code',
    'pno',
    'full_name',
    'full_name_normalized',
    'father_name',
    'rank',
    'initial_rank',
    'designation',
    'photo_path',
    'blood_group',
    'caste',
    'promotion_date',
    'appointment',
    'home_address',
    'recruitment_type',
    'sport_id',
    'sport_event',
    'other_notes',
    'team_since',
    'gender',
    'dob',
    'joining_date',
    'mobile',
    'home_district_id',
    'posting_district_id',
    'current_unit_id',
    'player_category',
    'player_level',
    'current_status',
    'source_refs',
])]
#[ObservedBy([AuditObserver::class])]
class Member extends Model
{
    /** @use HasFactory<MemberFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    /** @var list<string> */
    public const STATUSES = [
        'ACTIVE',
        'INACTIVE',
        'RESIGNED',
        'DISMISSED',
        'DECEASED',
        'RETIRED',
        'DOPING_DISQUALIFIED',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'joining_date' => 'date',
            'promotion_date' => 'date',
            'team_since' => 'date',
            'source_refs' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return Attribute<string, never> */
    protected function playerCategory(): Attribute
    {
        return Attribute::make(
            get: fn (string $value): string => $value === 'SKILLED' ? 'SPORTS_QUOTA' : $value,
        );
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsToMany<Sport, $this> */
    public function playableSports(): BelongsToMany
    {
        return $this->belongsToMany(Sport::class, 'member_sport')
            ->withPivot(['role', 'position', 'sport_event', 'weight', 'notes'])
            ->withTimestamps();
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<District, $this> */
    public function homeDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'home_district_id');
    }

    /** @return BelongsTo<District, $this> */
    public function postingDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'posting_district_id');
    }

    /** @return BelongsTo<Unit, $this> */
    public function currentUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'current_unit_id');
    }

    /** @return HasMany<MemberStatusHistory, $this> */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(MemberStatusHistory::class)->latest('effective_on');
    }

    /** @return HasMany<NameAlias, $this> */
    public function aliases(): HasMany
    {
        return $this->hasMany(NameAlias::class);
    }

    /** @return HasMany<MemberSpecialAchievement, $this> */
    public function specialAchievements(): HasMany
    {
        return $this->hasMany(MemberSpecialAchievement::class)->latest('awarded_on')->latest('id');
    }

    /** @return HasMany<Participation, $this> */
    public function participations(): HasMany
    {
        return $this->hasMany(Participation::class);
    }

    /** @return HasMany<TeamMember, $this> */
    public function teamMemberships(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    /** @return HasMany<ExternalCoachingAssignment, $this> */
    public function externalCoachingAssignments(): HasMany
    {
        return $this->hasMany(ExternalCoachingAssignment::class);
    }

    /** @return HasMany<ExternalTrainingAttendance, $this> */
    public function externalTrainingAttendances(): HasMany
    {
        return $this->hasMany(ExternalTrainingAttendance::class);
    }

    /** @return HasMany<ExternalCoachPerformanceUpdate, $this> */
    public function externalCoachPerformanceUpdates(): HasMany
    {
        return $this->hasMany(ExternalCoachPerformanceUpdate::class);
    }

    /** @param  Builder<Member>  $query */
    public function scopeRosterActive(Builder $query): void
    {
        $query
            ->where('current_status', 'ACTIVE')
            ->whereHas('teamMemberships', function (Builder $query): void {
                $query
                    ->whereNull('left_on')
                    ->whereHas('team', fn (Builder $query): Builder => $query->where('is_active', true));
            });
    }

    /** @param  Builder<Member>  $query */
    public function scopeRosterInactive(Builder $query): void
    {
        $query->where(function (Builder $query): void {
            $query
                ->where('current_status', '!=', 'ACTIVE')
                ->orWhereDoesntHave('teamMemberships', function (Builder $query): void {
                    $query
                        ->whereNull('left_on')
                        ->whereHas('team', fn (Builder $query): Builder => $query->where('is_active', true));
                });
        });
    }
}
