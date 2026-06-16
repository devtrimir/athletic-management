<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLegacyAchievementRequest extends FormRequest
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
            'period' => ['required', Rule::in(['PRE_RECRUITMENT', 'POST_RECRUITMENT'])],
            'session_id' => [
                'nullable',
                'integer',
                Rule::exists('sport_sessions', 'id')->where(
                    'organization_id',
                    (int) $this->user()->organization_id,
                ),
            ],
            'level' => ['required', Rule::in(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER'])],
            'competition_details' => ['required', 'string'],
            'event_date' => ['nullable', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'sport_discipline' => ['nullable', 'string', 'max:100'],
            'event' => ['nullable', 'string', 'max:100'],
            'medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'position' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:32767'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
