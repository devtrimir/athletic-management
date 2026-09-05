<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use App\Models\Coach;
use App\Models\Rank;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCoachPromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'promotion_date' => ['sometimes', 'nullable', 'date'],
            'from_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'to_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cash_reward_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'cash_reward_date' => ['sometimes', 'nullable', 'date'],
            'cash_reward_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cash_reward_remarks' => ['sometimes', 'nullable', 'string'],
            'reason' => ['sometimes', 'nullable', 'string'],
            'remarks' => ['sometimes', 'nullable', 'string'],
            'evidences' => ['sometimes', 'nullable', 'array'],
            'evidences.*.session_id' => ['required', 'integer', 'min:1'],
            'evidences.*.tournament_id' => ['required', 'integer', 'min:1'],
            'evidences.*.event_id' => ['prohibited'],
            'evidences.*.team_id' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $promotion = $this->route('promotion');

            $toRank = $this->input('to_rank', $promotion?->to_rank);
            $cashRewardAmount = $this->input('cash_reward_amount', $promotion?->cash_reward_amount);

            $hasPromotionFields = $this->filled('promotion_date')
                || $this->filled('to_rank')
                || $this->filled('from_rank')
                || $this->filled('reason')
                || $this->filled('remarks');

            $hasRewardFields = $this->filled('cash_reward_amount')
                || $this->filled('cash_reward_date')
                || $this->filled('cash_reward_reference')
                || $this->filled('cash_reward_remarks');

            $isPromotionRecord = $promotion?->to_rank !== null
                || $promotion?->promotion_date !== null
                || $promotion?->from_rank !== null
                || $promotion?->reason !== null
                || $promotion?->remarks !== null;

            $isRewardRecord = $promotion?->cash_reward_amount !== null
                || $promotion?->cash_reward_date !== null
                || $promotion?->cash_reward_reference !== null
                || $promotion?->cash_reward_remarks !== null;

            if ($hasPromotionFields || $isPromotionRecord) {
                if (! $toRank) {
                    $validator->errors()->add(
                        'to_rank',
                        __('The target rank is required.'),
                    );
                }

                $promotionDate = $this->input('promotion_date', $promotion?->promotion_date);

                if (! $promotionDate) {
                    $validator->errors()->add(
                        'promotion_date',
                        __('The promotion date is required.'),
                    );
                }
            }

            if (($hasRewardFields || $isRewardRecord) && ! $cashRewardAmount) {
                $validator->errors()->add(
                    'cash_reward_amount',
                    __('The cash reward amount is required.'),
                );
            }

            if (! $toRank && ! $cashRewardAmount) {
                $validator->errors()->add(
                    'to_rank',
                    __('Add a target rank or a cash reward amount.'),
                );
            }

            if (($toRank || $cashRewardAmount) && $this->has('evidences') && count($this->input('evidences', [])) === 0) {
                $validator->errors()->add(
                    'evidences',
                    __('Select at least one tournament event for this record.'),
                );
            }

            $coach = $this->route('coach');
            $fromRank = $this->input('from_rank')
                ?: ($promotion?->from_rank
                    ?? ($coach instanceof Coach ? $coach->rankMaster?->code : null));

            if (! $fromRank || ! $toRank) {
                return;
            }

            $fromOrder = $this->rankOrder((string) $fromRank);
            $toOrder = $this->rankOrder((string) $toRank);

            if ($fromOrder !== null && $toOrder !== null && $toOrder <= $fromOrder) {
                $validator->errors()->add(
                    'to_rank',
                    __('The target rank must be higher than the current rank.'),
                );
            }
        });
    }

    private function rankOrder(string $code): ?int
    {
        return Rank::query()->where('code', $code)->value('rank_order');
    }
}
