<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamRequest extends FormRequest
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
        $teamId = (int) $this->route('team')?->getKey();

        return [
            'sport_id' => ['sometimes', 'required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'session_id' => ['sometimes', 'required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'unit_id' => ['sometimes', 'required', 'integer', Rule::exists('units', 'id')->where('organization_id', $orgId)],
            'name_hi' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('teams', 'name_hi')
                    ->where('organization_id', $orgId)
                    ->where('sport_id', (int) ($this->input('sport_id') ?? $this->route('team')?->sport_id))
                    ->where('session_id', (int) ($this->input('session_id') ?? $this->route('team')?->session_id))
                    ->where('unit_id', (int) ($this->input('unit_id') ?? $this->route('team')?->unit_id))
                    ->ignore($teamId),
            ],
            'in_charge_hi' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
