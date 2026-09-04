<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use App\Rules\UniquePnoAcrossPeople;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCoachRequest extends FormRequest
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
        $coachId = (int) $this->route('coach')?->getKey();

        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'pno' => ['sometimes', 'nullable', 'string', 'max:20', new UniquePnoAcrossPeople($orgId, 'coaches', $coachId)],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:20'],
            'blood_group' => ['sometimes', 'nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])],
            'district_id' => ['sometimes', 'nullable', 'integer', Rule::exists('districts', 'id')],
            'unit_id' => ['sometimes', 'nullable', 'integer', Rule::exists('units', 'id')],
            'tier_master_id' => ['sometimes', 'nullable', 'integer', Rule::exists('tournament_tiers', 'id')],
            'rank_master_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ranks', 'id')],
            'designation_master_id' => ['sometimes', 'nullable', 'integer', Rule::exists('designations', 'id')],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'designation' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'gender' => ['sometimes', 'nullable', Rule::in(['M', 'F', 'O'])],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'coach_status' => ['sometimes', 'nullable', Rule::in(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'DISMISSED', 'DECEASED', 'SUSPENDED'])],
            'bio' => ['sometimes', 'nullable', 'string', 'max:4000'],
            'address' => ['sometimes', 'nullable', 'string', 'max:4000'],

            'certifications' => ['sometimes', 'nullable', 'array'],
            'certifications.*.id' => ['sometimes', 'integer'],
            'certifications.*.name' => ['required_with:certifications', 'string', 'max:255'],
            'certifications.*.certificate_type' => ['nullable', 'string', 'max:255'],
            'certifications.*.issuer' => ['nullable', 'string', 'max:255'],
            'certifications.*.issued_at' => ['nullable', 'date'],
            'certifications.*.expired_at' => ['nullable', 'date'],
            'certifications.*.attachment_path' => ['nullable', 'string', 'max:255'],
            'certifications.*.metadata' => ['nullable', 'array'],

            'sports' => ['sometimes', 'nullable', 'array'],
            'sports.*.sport_id' => ['required_with:sports', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sports.*.level_master_id' => ['nullable', 'integer', Rule::exists('tournament_tiers', 'id')],
            'sports.*.level' => ['nullable', 'string', 'max:100'],
            'sports.*.sport_event' => ['nullable', 'string', 'max:255'],
            'sports.*.is_primary' => ['nullable', 'boolean'],
            'sports.*.effective_from' => ['nullable', 'date'],
            'sports.*.effective_to' => ['nullable', 'date', 'after_or_equal:sports.*.effective_from'],
            'sports.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
