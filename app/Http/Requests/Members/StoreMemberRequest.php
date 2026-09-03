<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Rules\UniquePnoAcrossPeople;
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
            'pno' => ['nullable', 'string', 'max:20', new UniquePnoAcrossPeople($orgId)],
            'full_name' => ['required', 'string', 'max:255'],
            'full_name_normalized' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'rank' => ['nullable', 'string', 'max:100'],
            'initial_rank' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['M', 'F', 'O'])],
            'dob' => ['nullable', 'date', 'before:today'],
            'joining_date' => ['nullable', 'date'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'home_district_id' => ['nullable', 'exists:districts,id'],
            // A member is posted at a unit OR dedicated to a district — never both.
            'posting_district_id' => ['nullable', 'integer', 'exists:districts,id', 'prohibits:current_unit_id'],
            'current_unit_id' => ['nullable', 'integer', 'exists:units,id', 'prohibits:posting_district_id'],
            'player_category' => ['required', Rule::in(['GD', 'SPORTS_QUOTA'])],
            'player_level' => ['required', Rule::exists('tournament_tiers', 'code')],
            'source_refs' => ['nullable', 'array'],

            // P2B profile extension fields
            'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])],
            'caste' => ['nullable', 'string', 'max:100'],
            'promotion_date' => ['nullable', 'date'],
            'home_address' => ['nullable', 'string'],
            'recruitment_type' => ['nullable', Rule::in(['DIRECT', 'SPORTS_QUOTA', 'PROMOTED', 'OTHER'])],
            'playable_sports' => ['nullable', 'array'],
            'playable_sports.*.sport_id' => ['required', 'integer', 'distinct', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'playable_sports.*.role' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.position' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.sport_event' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.weight' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.notes' => ['nullable', 'string'],
            'sport_event' => ['nullable', 'string', 'max:100'],
            'other_notes' => ['nullable', 'string'],
            'team_since' => ['nullable', 'date'],
        ];
    }
}
