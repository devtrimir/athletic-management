<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSportRequest extends FormRequest
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
        $orgId = (int) $this->user()->organization_id;

        return [
            'name_hi' => ['required', 'string', 'max:100'],
            'name_en' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sports', 'name_en')->where('organization_id', $orgId),
            ],
            'category' => ['required', 'string', Rule::in(['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'])],
        ];
    }
}
