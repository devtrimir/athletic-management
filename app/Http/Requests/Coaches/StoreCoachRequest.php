<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoachRequest extends FormRequest
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
        $orgId = (int) $this->user()->organization_id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'pno' => ['nullable', 'string', 'max:20', Rule::unique('coaches', 'pno')->where('organization_id', $orgId)],
            'mobile' => ['nullable', 'string', 'max:20'],
            'nis_certified' => ['boolean'],
            'display_name' => ['nullable', 'string', 'max:255'],
            'designation' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'gender' => ['nullable', Rule::in(['M', 'F', 'O'])],
            'date_of_birth' => ['nullable', 'date'],
            'coach_status' => ['nullable', Rule::in(['ACTIVE', 'INACTIVE', 'RETIRED'])],
            'bio' => ['nullable', 'string', 'max:4000'],
            'address' => ['nullable', 'string', 'max:4000'],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'member_id' => ['nullable', 'integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],

            'certifications' => ['nullable', 'array'],
            'certifications.*.id' => ['sometimes', 'integer'],
            'certifications.*.name' => ['required_with:certifications', 'string', 'max:255'],
            'certifications.*.certificate_type' => ['nullable', 'string', 'max:255'],
            'certifications.*.issuer' => ['nullable', 'string', 'max:255'],
            'certifications.*.issued_at' => ['nullable', 'date'],
            'certifications.*.expired_at' => ['nullable', 'date'],
            'certifications.*.attachment_path' => ['nullable', 'string', 'max:255'],
            'certifications.*.metadata' => ['nullable', 'array'],

            'sports' => ['nullable', 'array'],
            'sports.*.sport_id' => ['required_with:sports', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sports.*.level' => ['nullable', 'string', 'max:100'],
            'sports.*.is_primary' => ['nullable', 'boolean'],
            'sports.*.effective_from' => ['nullable', 'date'],
            'sports.*.effective_to' => ['nullable', 'date', 'after_or_equal:sports.*.effective_from'],
            'sports.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
