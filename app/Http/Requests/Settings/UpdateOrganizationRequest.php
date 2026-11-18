<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
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
            'display_name_en' => ['required', 'string', 'max:150'],
            'display_name_hi' => ['required', 'string', 'max:150'],
        ];
    }
}
