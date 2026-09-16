<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
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
 * @property string|null $document_path
 * @property string|null $document_original_name
 * @property string|null $document_mime_type
 * @property int|null $document_size_bytes
 * @property int|null $recorded_by
 * @property int|null $coach_promotion_id
 * @property string $source
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read CoachPromotion|null $coachPromotion
 */
#[Fillable([
    'organization_id',
    'member_id',
    'coach_promotion_id',
    'promotion_date',
    'from_rank',
    'to_rank',
    'cash_reward_amount',
    'cash_reward_date',
    'cash_reward_reference',
    'cash_reward_remarks',
    'reason',
    'remarks',
    'document_path',
    'document_original_name',
    'document_mime_type',
    'document_size_bytes',
    'recorded_by',
    'source',
])]
#[ObservedBy([AuditObserver::class])]
class MemberPromotion extends Model
{
    /** @use HasFactory<MemberPromotionFactory> */
    use Auditable, HasFactory, Tenanted;

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

    /** @return BelongsTo<CoachPromotion, $this> */
    public function coachPromotion(): BelongsTo
    {
        return $this->belongsTo(CoachPromotion::class, 'coach_promotion_id');
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
