<?php

declare(strict_types=1);

namespace App\Http\Requests\Tournaments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTournamentRequest extends FormRequest
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
            'session_id' => ['sometimes', 'required', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'tier_id' => ['sometimes', 'required', 'integer', 'exists:tournament_tiers,id'],
            'sport_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'sport_ids.*' => ['integer', 'distinct', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'venue' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'raw_date_text' => ['nullable', 'string', 'max:500'],
        ];
    }
}
