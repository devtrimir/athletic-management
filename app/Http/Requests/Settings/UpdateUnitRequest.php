<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'unit_type' => ['required', 'string', Rule::in(['PAC', 'GRP', 'DISTRICT', 'HQ', 'OTHER'])],
            'commandant' => ['nullable', 'string', 'max:100'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
        ];
    }
}
