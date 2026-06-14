<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
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
            'pno' => ['nullable', 'string', 'max:20', Rule::unique('members', 'pno')->where('organization_id', $orgId)],
            'full_name' => ['required', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'rank' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['M', 'F', 'O'])],
            'dob' => ['nullable', 'date', 'before:today'],
            'joining_date' => ['nullable', 'date'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'home_district_id' => ['nullable', 'exists:districts,id'],
            'posting_district_id' => ['nullable', 'exists:districts,id'],
            'current_unit_id' => ['nullable', 'exists:units,id'],
            'player_category' => ['required', Rule::in(['GD', 'SPORTS_QUOTA'])],
            'player_level' => ['required', Rule::in(['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'])],
            'source_refs' => ['nullable', 'array'],

            // P2B profile extension fields
            'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])],
            'caste' => ['nullable', 'string', 'max:100'],
            'promotion_date' => ['nullable', 'date'],
            'appointment' => ['nullable', 'string', 'max:255'],
            'home_address' => ['nullable', 'string'],
            'recruitment_type' => ['nullable', Rule::in(['DIRECT', 'SPORTS_QUOTA', 'PROMOTED', 'OTHER'])],
            'playable_sports' => ['nullable', 'array'],
            'playable_sports.*.sport_id' => ['required', 'integer', 'distinct', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'playable_sports.*.role' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.position' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.sport_event' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.notes' => ['nullable', 'string'],
            'sport_event' => ['nullable', 'string', 'max:100'],
            'other_notes' => ['nullable', 'string'],
            'team_since' => ['nullable', 'date'],
        ];
    }
}
