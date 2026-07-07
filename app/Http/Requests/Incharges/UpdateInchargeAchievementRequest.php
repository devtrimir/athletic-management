<?php

declare(strict_types=1);

namespace App\Http\Requests\Incharges;

use App\Models\TournamentTier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInchargeAchievementRequest extends FormRequest
{
    private const FALLBACK_LEVEL_OPTIONS = [
        'INTERNATIONAL',
        'NATIONAL',
        'AIPSC',
        'STATE',
        'ZONAL',
        'OTHER',
    ];

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
            'period' => ['sometimes', 'required', Rule::in(['POST_RECRUITMENT'])],
            'level' => ['sometimes', 'required', Rule::in($this->levelOptions())],
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'competition_details' => ['sometimes', 'required', 'string'],
            'event_date' => ['sometimes', 'required', Rule::date()->format('Y-m-d')],
            'venue' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sport_discipline' => ['sometimes', 'nullable', 'string', 'max:100'],
            'event' => ['sometimes', 'nullable', 'string', 'max:100'],
            'discipline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'weight_category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender_class' => ['sometimes', 'nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'medal_type' => ['sometimes', 'nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'position' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9999'],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * @return string[]
     */
    private function levelOptions(): array
    {
        $codes = TournamentTier::query()
            ->orderByDesc('weight')
            ->orderBy('code')
            ->pluck('code')
            ->all();

        return $codes === [] ? self::FALLBACK_LEVEL_OPTIONS : $codes;
    }
}
