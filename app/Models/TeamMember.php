<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\TeamMemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int $member_id
 * @property int $session_id
 * @property string $role
 * @property Carbon|null $joined_on
 * @property Carbon|null $left_on
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Team $team
 * @property-read Member $member
 * @property-read SportSession $session
 */
#[Fillable([
    'team_id',
    'member_id',
    'session_id',
    'role',
    'joined_on',
    'left_on',
])]
#[ObservedBy([AuditObserver::class])]
class TeamMember extends Model
{
    /** @use HasFactory<TeamMemberFactory> */
    use Auditable, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'joined_on' => 'date',
            'left_on' => 'date',
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
}
