<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Models\Member;
use App\Models\Rank;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberPromotionRequest extends FormRequest
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
            'cash_reward_only' => ['sometimes', 'boolean'],
            'promotion_date' => ['sometimes', 'nullable', 'date'],
            'from_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'to_rank' => [
                'sometimes',
                Rule::requiredIf(fn (): bool => ! $this->boolean('cash_reward_only')),
                'nullable',
                'string',
                'max:100',
            ],
            'cash_reward_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'cash_reward_date' => ['sometimes', 'nullable', 'date'],
            'cash_reward_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cash_reward_remarks' => ['sometimes', 'nullable', 'string'],
            'reason' => ['sometimes', 'nullable', 'string'],
            'remarks' => ['sometimes', 'nullable', 'string'],
            'evidences' => ['sometimes', 'array', 'min:1'],
            'evidences.*.type' => ['required_with:evidences', Rule::in(['member_legacy_achievement', 'achievement', 'participation'])],
            'evidences.*.id' => ['required_with:evidences', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->boolean('cash_reward_only')) {
                return;
            }

            $member = $this->route('member');
            $promotion = $this->route('promotion');
            $fromRank = $this->input('from_rank')
                ?: ($promotion?->from_rank
                    ?? ($member instanceof Member ? $member->rank : null));
            $toRank = $this->input('to_rank');

            if (! $fromRank || ! $toRank) {
                return;
            }

            $fromOrder = $this->rankOrder($fromRank);
            $toOrder = $this->rankOrder($toRank);

            if (
                $fromOrder !== null &&
                $toOrder !== null &&
                $toOrder <= $fromOrder
            ) {
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
