<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSportRequest extends FormRequest
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

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sports', 'name')->where('organization_id', $orgId),
            ],
            'category' => ['required', 'string', Rule::in(['INDIVIDUAL', 'TEAM', 'COMBAT', 'WATER'])],
        ];
    }
}
