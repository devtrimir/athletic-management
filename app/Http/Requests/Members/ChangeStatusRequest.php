<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Models\Member;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeStatusRequest extends FormRequest
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
        $reasonRules = $this->input('status') === 'ACTIVE'
            ? ['nullable', 'string']
            : ['required', 'string'];

        return [
            'status' => ['required', Rule::in(Member::STATUSES)],
            'effective_on' => ['required', 'date'],
            'reason' => $reasonRules,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('Reason is required when the member is not active.'),
        ];
    }
}
