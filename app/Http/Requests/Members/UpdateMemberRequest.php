<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Rules\UniquePnoAcrossPeople;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
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
        $memberId = (int) $this->route('member')?->getKey();

        return [
            'pno' => ['sometimes', 'nullable', 'string', 'max:20', new UniquePnoAcrossPeople($orgId, 'members', $memberId)],
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'full_name_normalized' => ['sometimes', 'nullable', 'string', 'max:255'],
            'father_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'initial_rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'designation' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender' => ['sometimes', 'required', Rule::in(['M', 'F', 'O'])],
            'dob' => ['sometimes', 'nullable', 'date', 'before:today'],
            'joining_date' => ['sometimes', 'nullable', 'date'],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:20'],
            'home_district_id' => ['sometimes', 'nullable', 'exists:districts,id'],
            // A member is posted at a unit OR dedicated to a district — never both.
            'posting_district_id' => ['sometimes', 'nullable', 'integer', 'exists:districts,id', 'prohibits:current_unit_id'],
            'current_unit_id' => ['sometimes', 'nullable', 'integer', 'exists:units,id', 'prohibits:posting_district_id'],
            'player_category' => ['sometimes', 'required', Rule::in(['GD', 'SPORTS_QUOTA'])],
            'player_level' => ['sometimes', 'required', Rule::exists('tournament_tiers', 'code')],
            'source_refs' => ['sometimes', 'nullable', 'array'],

            // P2B profile extension fields
            'blood_group' => ['sometimes', 'nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])],
            'caste' => ['sometimes', 'nullable', 'string', 'max:100'],
            'promotion_date' => ['sometimes', 'nullable', 'date'],
            'home_address' => ['sometimes', 'nullable', 'string'],
            'playable_sports' => ['sometimes', 'nullable', 'array'],
            'playable_sports.*.sport_id' => ['required', 'integer', 'distinct', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'playable_sports.*.role' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.position' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.sport_event' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.weight' => ['nullable', 'string', 'max:100'],
            'playable_sports.*.notes' => ['nullable', 'string'],
            'sport_event' => ['sometimes', 'nullable', 'string', 'max:100'],
            'other_notes' => ['sometimes', 'nullable', 'string'],
            'team_since' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
