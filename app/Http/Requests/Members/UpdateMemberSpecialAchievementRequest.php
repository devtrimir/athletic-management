<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberSpecialAchievementRequest extends FormRequest
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
            'achievement_type' => ['sometimes', 'required', Rule::in([
                'COMMENDATION_DISC',
                'APPRECIATION_LETTER',
                'HONOUR_CERTIFICATE',
                'SPECIAL_RECOGNITION',
                'OTHER',
            ])],
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'awarded_on' => ['sometimes', 'nullable', Rule::date()->format('Y-m-d')],
            'issuing_authority' => ['sometimes', 'nullable', 'string', 'max:150'],
            'order_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'order_document' => ['sometimes', 'nullable', 'file', 'mimes:pdf,jpeg,jpg,png,webp', 'max:5120'],
            'place' => ['sometimes', 'nullable', 'string', 'max:150'],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
