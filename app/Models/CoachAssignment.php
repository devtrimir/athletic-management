<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CoachAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int $coach_id
 * @property int $session_id
 * @property string $role
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Team $team
 * @property-read Coach $coach
 * @property-read SportSession $session
 */
#[Fillable([
    'team_id',
    'coach_id',
    'session_id',
    'role',
])]
class CoachAssignment extends Model
{
    /** @use HasFactory<CoachAssignmentFactory> */
    use HasFactory;

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }
}
