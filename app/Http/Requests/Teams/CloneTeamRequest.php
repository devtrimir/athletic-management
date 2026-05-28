<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CloneTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;
        /** @var Team $team */
        $team = $this->route('team');

        return [
            'session_id' => [
                'required',
                'integer',
                Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId),
                Rule::notIn([$team->session_id]),
            ],
            'member_ids' => ['present', 'array'],
            'member_ids.*' => ['integer', Rule::exists('team_members', 'id')->where('team_id', $team->id)],
            'coach_ids' => ['present', 'array'],
            'coach_ids.*' => ['integer', Rule::exists('coach_assignments', 'id')->where('team_id', $team->id)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'session_id.not_in' => __('The target session must differ from the current session.'),
        ];
    }
}
