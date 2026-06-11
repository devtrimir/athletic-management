<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
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
            'to_rank' => ['required', 'string', 'max:100'],
            'cash_reward_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'cash_reward_date' => ['nullable', 'date'],
            'cash_reward_reference' => ['nullable', 'string', 'max:100'],
            'cash_reward_remarks' => ['nullable', 'string'],
            'reason' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'evidences' => ['required', 'array', 'min:1'],
            'evidences.*.type' => ['required', Rule::in(['member_legacy_achievement', 'achievement', 'participation'])],
            'evidences.*.id' => ['required', 'integer', 'min:1'],
        ];
    }
}
