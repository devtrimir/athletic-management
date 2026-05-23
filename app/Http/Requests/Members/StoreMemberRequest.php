<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
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
            'pno'              => ['nullable', 'string', 'max:20', Rule::unique('members', 'pno')->where('organization_id', $orgId)],
            'full_name_hi'     => ['required', 'string', 'max:255'],
            'full_name_en'     => ['nullable', 'string', 'max:255'],
            'father_name_hi'   => ['nullable', 'string', 'max:255'],
            'rank'             => ['nullable', 'string', 'max:100'],
            'gender'           => ['required', Rule::in(['M', 'F', 'O'])],
            'dob'              => ['nullable', 'date', 'before:today'],
            'joining_date'     => ['nullable', 'date'],
            'mobile'           => ['nullable', 'string', 'max:20'],
            'home_district_id' => ['nullable', 'exists:districts,id'],
            'current_unit_id'  => ['nullable', 'exists:units,id'],
            'player_category'  => ['required', Rule::in(['GD', 'SKILLED'])],
            'player_level'     => ['required', Rule::in(['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'])],
            'source_refs'      => ['nullable', 'array'],
        ];
    }
}
