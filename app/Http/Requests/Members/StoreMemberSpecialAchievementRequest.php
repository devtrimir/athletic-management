<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberSpecialAchievementRequest extends FormRequest
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
            'achievement_type' => ['required', Rule::in([
                'COMMENDATION_DISC',
                'APPRECIATION_LETTER',
                'HONOUR_CERTIFICATE',
                'SPECIAL_RECOGNITION',
                'OTHER',
            ])],
            'title' => ['required', 'string', 'max:150'],
            'awarded_on' => ['nullable', Rule::date()->format('Y-m-d')],
            'issuing_authority' => ['nullable', 'string', 'max:150'],
            'order_reference' => ['nullable', 'string', 'max:100'],
            'order_document' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png,webp', 'max:5120'],
            'place' => ['nullable', 'string', 'max:150'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
