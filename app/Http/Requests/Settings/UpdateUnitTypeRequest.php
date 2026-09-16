<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitTypeRequest extends FormRequest
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
        $unitTypeId = (int) $this->route('unit_type')->id;

        return [
            // Codes are used verbatim as Excel named-range suffixes in the
            // member import template's cascading Unit dropdown, so they must
            // be safe defined-name characters.
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Za-z][A-Za-z0-9_]*$/',
                Rule::unique('unit_types', 'code')->ignore($unitTypeId),
            ],
            'name' => ['required', 'string', 'max:100'],
            'name_en' => ['nullable', 'string', 'max:100'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
