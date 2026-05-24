<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoachRequest extends FormRequest
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
            'full_name_hi'  => ['required', 'string', 'max:255'],
            'full_name_en'  => ['nullable', 'string', 'max:255'],
            'pno'           => ['nullable', 'string', 'max:20', Rule::unique('coaches', 'pno')->where('organization_id', $orgId)],
            'mobile'        => ['nullable', 'string', 'max:20'],
            'nis_certified' => ['boolean'],
            'member_id'     => ['nullable', 'integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
        ];
    }
}
