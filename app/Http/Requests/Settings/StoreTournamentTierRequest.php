<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTournamentTierRequest extends FormRequest
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
            'code' => [
                'required',
                'string',
                Rule::in(['INTERNATIONAL', 'NATIONAL', 'AIPSC', 'STATE', 'ZONAL', 'OTHER']),
                Rule::unique('tournament_tiers', 'code'),
            ],
            'label_hi' => ['required', 'string', 'max:100'],
            'label_en' => ['required', 'string', 'max:100'],
            'weight' => ['required', 'integer', 'min:0', 'max:32767'],
        ];
    }
}
