<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDistrictRequest extends FormRequest
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
        $districtId = (int) $this->route('district')->id;

        return [
            'name_hi' => ['required', 'string', 'max:100'],
            'name_en' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'code' => [
                'required',
                'string',
                'max:10',
                Rule::unique('districts', 'code')->ignore($districtId),
            ],
        ];
    }
}
