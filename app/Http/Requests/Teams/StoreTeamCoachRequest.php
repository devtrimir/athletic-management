<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamCoachRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<ValidationRule|string>>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

        return [
            'coach_id' => ['required', 'integer', Rule::exists('coaches', 'id')->where('organization_id', $orgId)],
            'role' => ['required', 'string', Rule::in(['HEAD', 'ASSISTANT'])],
            'session_id' => ['required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
        ];
    }
}
