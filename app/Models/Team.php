<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\TeamFactory;
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
 * @property int $sport_id
 * @property int $session_id
 * @property int $unit_id
 * @property string $name_hi
 * @property string|null $in_charge_hi
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Sport $sport
 * @property-read SportSession $session
 * @property-read Unit $unit
 * @property-read int|null $team_members_count
 * @property-read int|null $coach_assignments_count
 */
#[Fillable([
    'organization_id',
    'sport_id',
    'session_id',
    'unit_id',
    'name_hi',
    'in_charge_hi',
])]
#[ObservedBy([AuditObserver::class])]
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

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

    /** @return HasMany<CoachAssignment, $this> */
    public function coachAssignments(): HasMany
    {
        return $this->hasMany(CoachAssignment::class);
    }
}
