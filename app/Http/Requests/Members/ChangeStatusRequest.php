<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

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
        return [
            'status' => ['required', Rule::in(['ACTIVE', 'INACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'])],
            'effective_on' => ['required', 'date'],
            'reason' => ['nullable', 'string'],
        ];
    }
}
