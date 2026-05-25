<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Tenanted;
use Database\Factories\AchievementBenefitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Records a tangible benefit received for a specific achievement —
 * works polymorphically against both MemberLegacyAchievement and Achievement (live).
 *
 * benefit_type = NONE explicitly records "confirmed no benefit granted"
 * (absence of a row means data not yet entered, NOT that no benefit was given).
 *
 * @property int $id
 * @property int $organization_id
 * @property string $benefitable_type
 * @property int $benefitable_id
 * @property string $benefit_type PROMOTION|OUT_OF_TURN_PROMOTION|CASH_AWARD|COMMENDATION|NONE|OTHER
 * @property string|null $promoted_from_rank
 * @property string|null $promoted_to_rank
 * @property float|null $cash_amount
 * @property Carbon|null $benefit_date
 * @property string|null $order_reference
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read MemberLegacyAchievement|Achievement $benefitable
 */
#[Fillable([
    'organization_id',
    'benefitable_type',
    'benefitable_id',
    'benefit_type',
    'promoted_from_rank',
    'promoted_to_rank',
    'cash_amount',
    'benefit_date',
    'order_reference',
    'remarks',
])]
class AchievementBenefit extends Model
{
    /** @use HasFactory<AchievementBenefitFactory> */
    use HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cash_amount' => 'decimal:2',
            'benefit_date' => 'date',
        ];
    }

    /**
     * The achievement this benefit belongs to (MemberLegacyAchievement or Achievement).
     *
     * @return MorphTo<Model, $this>
     */
    public function benefitable(): MorphTo
    {
        return $this->morphTo();
    }
}
