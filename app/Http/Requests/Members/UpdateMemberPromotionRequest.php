<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

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
            'promotion_date' => ['sometimes', 'nullable', 'date'],
            'from_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'to_rank' => ['sometimes', 'required', 'string', 'max:100'],
            'cash_reward_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
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
}
