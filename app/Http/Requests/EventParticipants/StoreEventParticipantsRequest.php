<?php

declare(strict_types=1);

namespace App\Http\Requests\EventParticipants;

use App\Models\Event;
use App\Models\TeamMember;
use App\Models\Tournament;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEventParticipantsRequest extends FormRequest
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
            'participants' => ['required', 'array', 'min:1'],
            'participants.*.member_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('members', 'id')->where('organization_id', $orgId),
            ],
            'participants.*.position' => ['nullable', 'integer', 'min:1'],
            'participants.*.team_id' => [
                'required',
                'integer',
                Rule::exists('teams', 'id')->where('organization_id', $orgId),
            ],
            'participants.*.medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT'])],
            'participants.*.medal_position' => ['nullable', 'integer', 'min:1'],
            'participants.*.remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $tournament = $this->route('tournament');
                $event = $this->route('event');

                if (! $tournament instanceof Tournament || ! $event instanceof Event) {
                    return;
                }

                foreach ((array) $this->input('participants', []) as $index => $row) {
                    if (! is_array($row) || empty($row['member_id']) || empty($row['team_id'])) {
                        continue;
                    }

                    $isActiveRosterMember = TeamMember::query()
                        ->where('member_id', (int) $row['member_id'])
                        ->where('team_id', (int) $row['team_id'])
                        ->where('session_id', $tournament->session_id)
                        ->whereNull('left_on')
                        ->whereHas('team', function ($query) use ($event, $tournament): void {
                            $query
                                ->where('organization_id', $tournament->organization_id)
                                ->where('session_id', $tournament->session_id)
                                ->where('sport_id', $event->sport_id)
                                ->where('is_active', true);
                        })
                        ->exists();

                    if (! $isActiveRosterMember) {
                        $validator->errors()->add(
                            "participants.{$index}.member_id",
                            __('Participant must belong to an active team for this event sport and session.'),
                        );
                    }
                }
            },
        ];
    }
}
