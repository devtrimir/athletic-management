<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLegacyAchievementRequest extends FormRequest
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
            'period' => ['sometimes', 'required', Rule::in(['PRE_RECRUITMENT', 'POST_RECRUITMENT'])],
            'session_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('sport_sessions', 'id')->where(
                    'organization_id',
                    (int) $this->user()->organization_id,
                ),
            ],
            'level' => ['sometimes', 'required', Rule::in(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER'])],
            'competition_details' => ['sometimes', 'required', 'string'],
            'event_date' => ['sometimes', 'nullable', 'date'],
            'venue' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sport_discipline' => ['sometimes', 'nullable', 'string', 'max:100'],
            'event' => ['sometimes', 'nullable', 'string', 'max:100'],
            'medal_type' => ['sometimes', 'nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'position' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9999'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:32767'],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
