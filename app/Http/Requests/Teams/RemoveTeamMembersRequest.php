<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RemoveTeamMembersRequest extends FormRequest
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
            'member_ids' => [Rule::requiredIf(fn (): bool => $this->routeIs('teams.members.bulkDestroy')), 'array', 'min:1'],
            'member_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
            'session_id' => ['nullable', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'left_on' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }
}
