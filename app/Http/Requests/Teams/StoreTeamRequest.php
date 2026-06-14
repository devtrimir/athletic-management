<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamRequest extends FormRequest
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
            'sport_id' => ['required', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'session_id' => ['required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('organization_id', $orgId)],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('teams', 'name')
                    ->where('organization_id', $orgId)
                    ->where('sport_id', (int) $this->input('sport_id'))
                    ->where('session_id', (int) $this->input('session_id'))
                    ->where('unit_id', (int) $this->input('unit_id')),
            ],
            'in_charge' => ['nullable', 'string', 'max:255'],
        ];
    }
}
