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
            'benefitable_type' => ['required', Rule::in(['achievement'])],
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'benefitable_type.in' => 'Cash reward can only be added for an event that has a recorded achievement.',
            'cash_amount.numeric' => 'Enter the cash amount using digits only, without commas or currency symbols.',
            'cash_amount.min' => 'The cash amount must be zero or more.',
            'cash_amount.max' => 'The cash amount may not be greater than 99999999.99.',
        ];
    }
}
