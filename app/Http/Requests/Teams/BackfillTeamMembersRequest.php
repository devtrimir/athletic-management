<?php

declare(strict_types=1);

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BackfillTeamMembersRequest extends FormRequest
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
            'member_ids' => ['nullable', 'array', 'required_without:paste'],
            'member_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
            'paste' => ['nullable', 'string', 'max:20000', 'required_without:member_ids'],
            'role' => ['sometimes', 'string', Rule::in(['PLAYER', 'CAPTAIN', 'RESERVE'])],
            'joined_on' => ['nullable', 'date'],
            'left_on' => ['nullable', 'date', 'after_or_equal:joined_on'],
            'reason' => ['nullable', 'string', 'max:1000', Rule::requiredIf(fn (): bool => filled($this->input('left_on')))],
        ];
    }
}
