<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamMemberRequest extends FormRequest
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
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
            'session_id' => ['sometimes', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'role' => ['sometimes', 'string', Rule::in(['PLAYER', 'CAPTAIN', 'RESERVE'])],
            'joined_on' => ['sometimes', 'nullable', 'date'],
            'left_on' => ['sometimes', 'nullable', 'date', 'after_or_equal:joined_on'],
        ];
    }
}
