<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Models\Member;
use App\Models\TeamMember;
use App\Rules\UniquePnoAcrossPeople;
use App\Support\Members\PlayerCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('player_category') && is_string($this->input('player_category'))) {
            $normalized = PlayerCategory::normalize($this->input('player_category'));
            if ($normalized !== null) {
                $this->merge(['player_category' => $normalized]);
            }
        }
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
            'gender' => ['sometimes', 'required', Rule::in(['M', 'F', 'O'])],
            'dob' => ['sometimes', 'nullable', 'date', 'before:today'],
            'joining_date' => ['sometimes', 'nullable', 'date'],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:20'],
            'home_district_id' => ['sometimes', 'nullable', 'exists:districts,id', 'prohibits:other_home_district'],
            'other_home_district' => ['sometimes', 'nullable', 'string', 'max:255', 'prohibits:home_district_id'],
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

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->has('playable_sports')) {
                    return;
                }

                $member = $this->route('member');
                if (! $member instanceof Member) {
                    $member = Member::find($member);
                }

                if (! $member) {
                    return;
                }

                $newSportIds = collect($this->input('playable_sports', []))
                    ->filter(fn (mixed $item): bool => is_array($item) && ! empty($item['sport_id']))
                    ->map(fn (array $item): int => (int) $item['sport_id'])
                    ->all();

                $existingSportIds = $member->playableSports()->pluck('sports.id')->all();
                $removedSportIds = array_values(array_diff($existingSportIds, $newSportIds));

                if (empty($removedSportIds)) {
                    return;
                }

                $blockingMembership = TeamMember::query()
                    ->where('member_id', $member->id)
                    ->whereNull('left_on')
                    ->whereHas('team', function ($query) use ($removedSportIds): void {
                        $query->whereIn('sport_id', $removedSportIds)
                            ->where('is_active', true)
                            ->whereNull('deleted_at');
                    })
                    ->with(['team.sport:id,name', 'team:id,name,sport_id'])
                    ->first();

                if ($blockingMembership !== null && $blockingMembership->team !== null) {
                    $sportName = $blockingMembership->team->sport?->name ?? __('this sport');
                    $teamName = $blockingMembership->team->name;

                    $validator->errors()->add(
                        'playable_sports',
                        __("Cannot remove :sport because the member is currently an active member of team ':team'.", [
                            'sport' => $sportName,
                            'team' => $teamName,
                        ])
                    );
                }
            },
        ];
    }
}
