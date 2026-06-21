<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLegacyAchievementRequest extends FormRequest
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
        if (! $this->exists('medal_type')) {
            return;
        }

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
            'event_date' => ['sometimes', 'required', 'date'],
            'venue' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sport_id' => ['sometimes', 'nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sport_discipline' => ['sometimes', 'nullable', 'string', 'max:100'],
            'event' => ['sometimes', 'nullable', 'string', 'max:100'],
            'discipline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'weight_category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender_class' => ['sometimes', 'nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'medal_type' => ['sometimes', 'nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'position' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9999'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:32767'],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
