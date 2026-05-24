<?php

declare(strict_types=1);

namespace App\Http\Requests\EventParticipants;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventParticipantsRequest extends FormRequest
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
            'participants'                   => ['required', 'array', 'min:1'],
            'participants.*.member_id'       => [
                'required',
                'integer',
                'distinct',
                Rule::exists('members', 'id')->where('organization_id', $orgId),
            ],
            'participants.*.position'        => ['nullable', 'integer', 'min:1'],
            'participants.*.team_id'         => [
                'nullable',
                'integer',
                Rule::exists('teams', 'id')->where('organization_id', $orgId),
            ],
            'participants.*.medal_type'      => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT'])],
            'participants.*.medal_position'  => ['nullable', 'integer', 'min:1'],
            'participants.*.remarks'         => ['nullable', 'string', 'max:500'],
        ];
    }
}
