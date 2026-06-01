<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAchievementBenefitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'benefitable_type' => ['required', Rule::in(['member_legacy_achievement', 'achievement'])],
            'benefitable_id' => ['required', 'integer', 'min:1'],
            'benefit_type' => ['required', Rule::in(['PROMOTION', 'OUT_OF_TURN_PROMOTION', 'CASH_AWARD', 'COMMENDATION', 'NONE', 'OTHER'])],
            'promoted_from_rank' => ['nullable', 'string', 'max:100'],
            'promoted_to_rank' => ['nullable', 'string', 'max:100'],
            'cash_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'benefit_date' => ['nullable', 'date'],
            'order_reference' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
