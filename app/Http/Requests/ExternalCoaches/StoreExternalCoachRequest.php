<?php

declare(strict_types=1);

namespace App\Http\Requests\ExternalCoaches;

use App\Models\ExternalCoachDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExternalCoachRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => $this->normalizeIndianMobile($this->input('phone')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...self::extraRules(),
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/', Rule::unique('external_coaches', 'phone')],
            'email' => ['required', 'email', 'max:255', Rule::unique('external_coaches', 'email')],
            'password' => ['required', 'string', 'min:8'],
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

    /**
     * Rules for the photo, sports, venues and documents shared by store and update.
     *
     * @return array<string, mixed>
     */
    public static function extraRules(): array
    {
        $orgId = (int) auth()->user()?->organization_id;

        return [
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_photo' => ['nullable', 'boolean'],
            'sport_ids' => ['nullable', 'array'],
            'sport_ids.*' => ['integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'training_venue_ids' => ['nullable', 'array'],
            'training_venue_ids.*' => ['integer', Rule::exists('training_venues', 'id')->where('organization_id', $orgId)],
            'documents' => ['nullable', 'array', 'max:10'],
            'documents.*.type' => ['required', Rule::in(ExternalCoachDocument::TYPES)],
            'documents.*.file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:20480'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => __('Enter a valid Indian mobile number.'),
        ];
    }

    private function normalizeIndianMobile(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $digits = preg_replace('/\D+/', '', trim($value));

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return substr($digits, 2);
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            return substr($digits, 1);
        }

        return $digits;
    }
}
