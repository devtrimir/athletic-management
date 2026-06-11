<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\PromotionEvidenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $member_promotion_id
 * @property string $evidencable_type
 * @property int $evidencable_id
 */
#[Fillable([
    'organization_id',
    'member_promotion_id',
    'evidencable_type',
    'evidencable_id',
])]
#[ObservedBy([AuditObserver::class])]
#[Table('promotion_evidences')]
class PromotionEvidence extends Model
{
    /** @use HasFactory<PromotionEvidenceFactory> */
    use HasFactory, Tenanted;

    /** @return BelongsTo<MemberPromotion, $this> */
    public function memberPromotion(): BelongsTo
    {
        return $this->belongsTo(MemberPromotion::class);
    }

    /** @return MorphTo<Model, $this> */
    public function evidencable(): MorphTo
    {
        return $this->morphTo();
    }
}
