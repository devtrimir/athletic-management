<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

        return [
            'code' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_]+$/', Rule::unique('roles', 'code')->where('organization_id', $orgId)],
            'name_hi' => ['required', 'string', 'max:100'],
            'name_en' => ['required', 'string', 'max:100'],
        ];
    }
}
