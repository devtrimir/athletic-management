<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeStatusRequest extends FormRequest
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
        return [
            'status'       => ['required', Rule::in(['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'])],
            'effective_on' => ['required', 'date'],
            'reason_hi'    => ['nullable', 'string'],
        ];
    }
}
