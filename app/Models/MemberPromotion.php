<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\HasMedia;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\MemberPromotionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $member_id
 * @property Carbon|null $promotion_date
 * @property string|null $from_rank
 * @property string $to_rank
 * @property string|null $cash_reward_amount
 * @property Carbon|null $cash_reward_date
 * @property string|null $cash_reward_reference
 * @property string|null $cash_reward_remarks
 * @property string|null $reason
 * @property string|null $remarks
 * @property int|null $recorded_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable([
    'organization_id',
    'member_id',
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
class MemberPromotion extends Model
{
    /** @use HasFactory<MemberPromotionFactory> */
    use Auditable, HasFactory, HasMedia, Tenanted;

    protected function casts(): array
    {
        return [
            'promotion_date' => 'date',
            'cash_reward_date' => 'date',
            'cash_reward_amount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** @return BelongsTo<User, $this> */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /** @return HasMany<PromotionEvidence, $this> */
    public function evidences(): HasMany
    {
        return $this->hasMany(PromotionEvidence::class);
    }
}
