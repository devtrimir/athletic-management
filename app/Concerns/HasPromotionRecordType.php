<?php

declare(strict_types=1);

namespace App\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Keeps the `record_type` column ('promotion' | 'reward' | 'promotion_reward')
 * in sync with the promotion/reward fields on the model, so callers can filter
 * or badge by record type without re-deriving it from raw column values.
 *
 * @mixin Model
 */
trait HasPromotionRecordType
{
    protected static function bootHasPromotionRecordType(): void
    {
        static::saving(function (Model $model): void {
            $model->record_type = $model->resolveRecordType();
        });
    }

    private function resolveRecordType(): string
    {
        $hasPromotion = $this->promotion_date !== null
            || ($this->from_rank !== null && $this->to_rank !== null && $this->from_rank !== $this->to_rank)
            || $this->reason !== null
            || $this->remarks !== null;

        $hasReward = $this->cash_reward_amount !== null
            || $this->cash_reward_date !== null
            || $this->cash_reward_reference !== null
            || $this->cash_reward_remarks !== null;

        if ($hasPromotion && $hasReward) {
            return 'promotion_reward';
        }

        if ($hasReward) {
            return 'reward';
        }

        return 'promotion';
    }
}
