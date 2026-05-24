<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCoachRequest extends FormRequest
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
        $orgId   = (int) $this->user()->organization_id;
        $coachId = (int) $this->route('coach')?->getKey();

        return [
            'full_name_hi'  => ['sometimes', 'required', 'string', 'max:255'],
            'full_name_en'  => ['sometimes', 'nullable', 'string', 'max:255'],
            'pno'           => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('coaches', 'pno')->where('organization_id', $orgId)->ignore($coachId)],
            'mobile'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'nis_certified' => ['sometimes', 'boolean'],
            'member_id'     => ['sometimes', 'nullable', 'integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
        ];
    }
}
