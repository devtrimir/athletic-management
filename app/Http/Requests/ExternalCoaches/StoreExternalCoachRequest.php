<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoaches;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreExternalCoachRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('external_coaches', 'phone')],
            'email' => ['required', 'email', 'max:255', Rule::unique('external_coaches', 'email')],
            'password' => ['required', 'string', Password::defaults()],
            'gender' => ['nullable', Rule::in(['M', 'F', 'O'])],
            'date_of_birth' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:4000'],
            'district_id' => ['nullable', 'integer', Rule::exists('districts', 'id')],
            'city' => ['nullable', 'string', 'max:255'],
            'experience_years' => ['nullable', 'integer', 'min:0', 'max:80'],
            'certification_details' => ['nullable', 'string', 'max:4000'],
            'emergency_contact' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:4000'],
            'status' => ['required', Rule::in(['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'])],
            'status_reason' => ['nullable', 'string', 'max:4000', Rule::requiredIf(fn (): bool => in_array($this->string('status')->toString(), ['suspended', 'blacklisted'], true))],
        ];
    }
}
