<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use App\Models\Team;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamCoachRequest extends FormRequest
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
        $team = $this->route('team');
        $teamSportId = $team instanceof Team ? (int) $team->sport_id : null;

        $coachRules = [
            'required',
            'integer',
            Rule::exists('coaches', 'id')->where('organization_id', $orgId),
        ];

        if ($teamSportId !== null) {
            $coachRules[] = Rule::exists('coach_sport', 'coach_id')->where('sport_id', $teamSportId);
        }

        return [
            'coach_id' => $coachRules,
            'role' => ['required', 'string', Rule::in(['HEAD', 'ASSISTANT'])],
            'assigned_at' => ['required', 'date', 'before_or_equal:today'],
        ];
    }
}
