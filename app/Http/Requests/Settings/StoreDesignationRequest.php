<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\Designation;
use Illuminate\Foundation\Http\FormRequest;

class StoreDesignationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'mapped_rank_code' => $this->input('mapped_rank_code') ?: null,
        ]);
    }

    public function authorize(): bool
    {
        return $this->user()?->can('create', Designation::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:designations,code'],
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:100'],
            'designation_order' => ['required', 'integer', 'min:1'],
            'mapped_rank_code' => ['nullable', 'string', 'max:50', 'exists:ranks,code'],
            'designation_type' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ];
    }
}
