<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CloseTeamSessionRequest extends FormRequest
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
            'session_id' => ['required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'closed_on' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
            'remove_coaches' => ['required', 'boolean'],
        ];
    }
}
