<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\HasMedia;
use App\Observers\AuditObserver;
use Database\Factories\ParticipationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $event_id
 * @property int $member_id
 * @property int|null $team_id
 * @property int $session_id
 * @property int|null $position
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Event $event
 * @property-read Member $member
 * @property-read Team|null $team
 * @property-read SportSession $session
 * @property-read Achievement|null $achievement
 */
#[Fillable([
    'event_id',
    'member_id',
    'team_id',
    'session_id',
    'position',
])]
#[ObservedBy([AuditObserver::class])]
class Participation extends Model
{
    /** @use HasFactory<ParticipationFactory> */
    use Auditable, HasFactory, HasMedia;

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
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

    /** @return HasOne<Achievement, $this> */
    public function achievement(): HasOne
    {
        return $this->hasOne(Achievement::class);
    }
}
