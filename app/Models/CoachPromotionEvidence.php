<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachPromotionEvidenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $coach_promotion_id
 * @property int $session_id
 * @property int $tournament_id
 * @property int|null $event_id
 * @property int|null $team_id
 * @property int|null $achievement_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable([
    'organization_id',
    'coach_promotion_id',
    'session_id',
    'tournament_id',
    'event_id',
    'team_id',
    'achievement_id',
])]
#[ObservedBy([AuditObserver::class])]
#[Table('coach_promotion_evidence')]
class CoachPromotionEvidence extends Model
{
    /** @use HasFactory<CoachPromotionEvidenceFactory> */
    use Auditable, HasFactory, Tenanted;

    /** @return BelongsTo<CoachPromotion, $this> */
    public function coachPromotion(): BelongsTo
    {
        return $this->belongsTo(CoachPromotion::class);
    }

    /** @return BelongsTo<SportSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(SportSession::class);
    }

    /** @return BelongsTo<Tournament, $this> */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<Achievement, $this> */
    public function achievement(): BelongsTo
    {
        return $this->belongsTo(Achievement::class);
    }
}
