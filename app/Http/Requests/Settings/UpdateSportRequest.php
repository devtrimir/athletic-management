<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSportRequest extends FormRequest
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
        $orgId = (int) $this->user()->organization_id;
        $sportId = (int) $this->route('sport')->id;

        return [
            'name_hi' => ['required', 'string', 'max:100'],
            'name_en' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sports', 'name_en')
                    ->where('organization_id', $orgId)
                    ->ignore($sportId),
            ],
            'category' => ['required', 'string', Rule::in(['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'])],
        ];
    }
}
