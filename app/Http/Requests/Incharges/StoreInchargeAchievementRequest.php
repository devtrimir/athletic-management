<?php

declare(strict_types=1);

namespace App\Http\Requests\Incharges;

use App\Models\TournamentTier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInchargeAchievementRequest extends FormRequest
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
        $orgId = (int) $this->user()->organization_id;

        return [
            'title' => ['required', 'string', 'max:150'],
            'period' => ['nullable', Rule::in(['PRE_RECRUITMENT', 'POST_RECRUITMENT'])],
            'level' => ['required', Rule::in($this->levelOptions())],
            'competition_details' => ['nullable', 'string'],
            'event_date' => ['required', Rule::date()->format('Y-m-d')],
            'venue' => ['nullable', 'string', 'max:255'],
            'sport_id' => ['required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sport_discipline' => ['nullable', 'string', 'max:100'],
            'event' => ['nullable', 'string', 'max:100'],
            'discipline' => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class' => ['nullable', Rule::in(['M', 'F', 'MIXED', 'OPEN'])],
            'medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT', 'CERTIFICATE'])],
            'event_type' => ['required', Rule::in(['team', 'individual'])],
            'position' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'description' => ['nullable', 'string'],
            'achieved_on' => ['nullable', Rule::date()->format('Y-m-d')],
            'remarks' => ['nullable', 'string'],
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
