<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int $member_id
 * @property int $session_id
 * @property int|null $team_member_id
 * @property int|null $created_by
 * @property string $action
 * @property string|null $role
 * @property Carbon|null $effective_on
 * @property string|null $reason
 * @property string $source
 * @property string|null $batch_uuid
 * @property array<string, mixed>|null $metadata
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Team $team
 * @property-read Member $member
 * @property-read SportSession $session
 * @property-read TeamMember|null $teamMember
 * @property-read User|null $createdBy
 */
#[Fillable([
    'team_id',
    'member_id',
    'session_id',
    'team_member_id',
    'created_by',
    'action',
    'role',
    'effective_on',
    'reason',
    'source',
    'batch_uuid',
    'metadata',
])]
class TeamMemberMovement extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_on' => 'date',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    /** @return BelongsTo<TeamMember, $this> */
    public function teamMember(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class);
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
