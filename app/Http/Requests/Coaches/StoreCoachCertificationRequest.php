<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use Illuminate\Foundation\Http\FormRequest;

class StoreCoachCertificationRequest extends FormRequest
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
            'id' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'certificate_type' => ['nullable', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'issued_at' => ['nullable', 'date'],
            'expired_at' => ['nullable', 'date', 'after_or_equal:issued_at'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png,webp', 'max:5120'],
        ];
    }
}
