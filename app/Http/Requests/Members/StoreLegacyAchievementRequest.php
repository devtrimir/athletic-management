<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLegacyAchievementRequest extends FormRequest
{
    private const MEDAL_POSITION_MAP = [
        'GOLD' => 1,
        'SILVER' => 2,
        'BRONZE' => 3,
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $medalType = $this->input('medal_type');

        $this->merge([
            'position' => self::MEDAL_POSITION_MAP[$medalType] ?? null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

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
            'event_date' => ['required', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sport_discipline' => ['nullable', 'string', 'max:100'],
            'event' => ['nullable', 'string', 'max:100'],
            'discipline' => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class' => ['nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'position' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:32767'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
