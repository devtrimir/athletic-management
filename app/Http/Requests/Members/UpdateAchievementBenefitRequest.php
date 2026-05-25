<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAchievementBenefitRequest extends FormRequest
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
            'benefit_type' => ['sometimes', 'required', Rule::in(['PROMOTION', 'OUT_OF_TURN_PROMOTION', 'CASH_AWARD', 'COMMENDATION', 'NONE', 'OTHER'])],
            'promoted_from_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'promoted_to_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cash_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'benefit_date' => ['sometimes', 'nullable', 'date'],
            'order_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
