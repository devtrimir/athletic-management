<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
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
        $orgId    = (int) $this->user()->organization_id;
        $memberId = (int) $this->route('member')?->getKey();

        return [
            'pno'              => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('members', 'pno')->where('organization_id', $orgId)->ignore($memberId)],
            'full_name_hi'     => ['sometimes', 'required', 'string', 'max:255'],
            'full_name_en'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'father_name_hi'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'rank'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender'           => ['sometimes', 'required', Rule::in(['M', 'F', 'O'])],
            'dob'              => ['sometimes', 'nullable', 'date', 'before:today'],
            'joining_date'     => ['sometimes', 'nullable', 'date'],
            'mobile'           => ['sometimes', 'nullable', 'string', 'max:20'],
            'home_district_id' => ['sometimes', 'nullable', 'exists:districts,id'],
            'current_unit_id'  => ['sometimes', 'nullable', 'exists:units,id'],
            'player_category'  => ['sometimes', 'required', Rule::in(['GD', 'SKILLED'])],
            'player_level'     => ['sometimes', 'required', Rule::in(['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'])],
            'source_refs'      => ['sometimes', 'nullable', 'array'],
        ];
    }
}
