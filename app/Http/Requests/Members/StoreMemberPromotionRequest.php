<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Models\Member;
use App\Models\Rank;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;

class StoreMemberPromotionRequest extends FormRequest
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
            'promotion_date' => ['nullable', 'date'],
            'from_rank' => ['nullable', 'string', 'max:100'],
            'to_rank' => [
                'required',
                'string',
                'max:100',
            ],
            'reason' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'evidences' => ['required', 'array', 'min:1'],
            'evidences.*.type' => ['required', Rule::in(['member_legacy_achievement', 'achievement', 'participation'])],
            'evidences.*.id' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $member = $this->route('member');
            $fromRank = $this->input('from_rank')
                ?: ($member instanceof Member ? $member->rank : null);
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
