<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTournamentTierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<ValidationRule|string>>
     */
    public function rules(): array
    {
        $tierId = (int) $this->route('tournament_tier')->id;

        return [
            'code' => [
                'required',
                'string',
                Rule::in(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER']),
                Rule::unique('tournament_tiers', 'code')->ignore($tierId),
            ],
            'label_hi' => ['required', 'string', 'max:100'],
            'label_en' => ['required', 'string', 'max:100'],
            'weight' => ['required', 'integer', 'min:0', 'max:32767'],
        ];
    }
}
