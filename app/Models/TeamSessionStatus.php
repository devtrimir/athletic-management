<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\TeamSessionStatusFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $team_id
 * @property int $session_id
 * @property string $status
 * @property int|null $carried_forward_to_session_id
 * @property Carbon|null $carried_forward_at
 * @property int|null $carried_forward_by
 * @property Carbon|null $closed_at
 * @property string|null $closed_reason
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read Team $team
 * @property-read SportSession $session
 * @property-read SportSession|null $carriedForwardToSession
 * @property-read User|null $carriedForwardBy
 */
#[Fillable([
    'organization_id',
    'team_id',
    'session_id',
    'status',
    'carried_forward_to_session_id',
    'carried_forward_at',
    'carried_forward_by',
    'closed_at',
    'closed_reason',
])]
#[ObservedBy([AuditObserver::class])]
class TeamSessionStatus extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_CARRIED_FORWARD = 'carried_forward';

    public const STATUS_INACTIVE = 'inactive';

    /** @use HasFactory<TeamSessionStatusFactory> */
    use Auditable, HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'carried_forward_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @return BelongsTo<SportSession, $this> */
    public function carriedForwardToSession(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'carried_forward_to_session_id');
    }

    /** @return BelongsTo<User, $this> */
    public function carriedForwardBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'carried_forward_by');
    }
}
