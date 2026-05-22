<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSportSessionRequest extends FormRequest
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
            'name' => [
                'required',
                'string',
                'max:10',
                Rule::unique('sport_sessions', 'name')->where('organization_id', $orgId),
            ],
            'start_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'end_year' => ['required', 'integer', 'min:2000', 'max:2100', 'gt:start_year'],
            'is_current' => ['required', 'boolean'],
        ];
    }
}
