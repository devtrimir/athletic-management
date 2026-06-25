<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CoachPromotionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $coach_id
 * @property Carbon|null $promotion_date
 * @property string|null $from_rank
 * @property string|null $to_rank
 * @property string|null $cash_reward_amount
 * @property Carbon|null $cash_reward_date
 * @property string|null $cash_reward_reference
 * @property string|null $cash_reward_remarks
 * @property string|null $reason
 * @property string|null $remarks
 * @property int|null $recorded_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read User|null $recorder
 * @property-read Collection<int, CoachPromotionEvidence> $evidences
 */
#[Fillable([
    'organization_id',
    'coach_id',
    'promotion_date',
    'from_rank',
    'to_rank',
    'cash_reward_amount',
    'cash_reward_date',
    'cash_reward_reference',
    'cash_reward_remarks',
    'reason',
    'remarks',
    'recorded_by',
])]
#[ObservedBy([AuditObserver::class])]
class CoachPromotion extends Model
{
    /** @use HasFactory<CoachPromotionFactory> */
    use Auditable, HasFactory, Tenanted;

    protected function casts(): array
    {
        return [
            'promotion_date' => 'date',
            'cash_reward_date' => 'date',
            'cash_reward_amount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<User, $this> */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /** @return HasMany<CoachPromotionEvidence, $this> */
    public function evidences(): HasMany
    {
        return $this->hasMany(CoachPromotionEvidence::class);
    }
}
