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
        $event = $this->route('event');
        $eventType = $event instanceof Event ? $event->event_type : 'individual';

        return [
            'participants' => ['required', 'array', 'min:1'],
            'participants.*.member_id' => [
                Rule::requiredIf($eventType === 'individual'),
                'nullable',
                'integer',
                Rule::exists('members', 'id')->where('organization_id', $orgId),
                'distinct',
            ],
            'participants.*.team_id' => [
                Rule::requiredIf($eventType === 'team'),
                'nullable',
                'integer',
                Rule::exists('teams', 'id')->where('organization_id', $orgId),
            ],
            'participants.*.player_ids' => ['nullable', 'array'],
            'participants.*.player_ids.*' => ['integer', Rule::exists('members', 'id')->where('organization_id', $orgId)],
            'participants.*.position' => ['nullable', 'integer', 'min:1'],
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

                $eventType = $event->event_type;
                $rows = (array) $this->input('participants', []);
                $teamRows = 0;
                $usedTeamIds = [];

                foreach ($rows as $index => $row) {
                    if (! is_array($row)) {
                        continue;
                    }

                    $teamId = (int) ($row['team_id'] ?? 0);
                    $memberId = (int) ($row['member_id'] ?? 0);
                    $playerIds = array_values(array_unique(array_map('intval', (array) ($row['player_ids'] ?? []))));
                    $playerIds = array_values(array_filter($playerIds, static fn (int $memberId): bool => $memberId > 0));
                    $medalType = strtoupper((string) ($row['medal_type'] ?? ''));
                    $positionValue = $row['position'] ?? $row['medal_position'] ?? null;

                    if ($medalType === 'MERIT') {
                        if ($positionValue === null || $positionValue === '') {
                            $validator->errors()->add("participants.{$index}.position", __('Merit medal needs a position.'));
                        } elseif (! is_numeric($positionValue) || ! in_array((int) $positionValue, [1, 2, 3], true)) {
                            $validator->errors()->add("participants.{$index}.position", __('Position must be 1, 2, or 3 for merit medals.'));
                        }
                    }

                    if ($eventType === 'team') {
                        if ($teamId <= 0) {
                            $validator->errors()->add("participants.{$index}.team_id", __('Team is required for team events.'));

                            continue;
                        }

                        if (in_array($teamId, $usedTeamIds, true)) {
                            $validator->errors()->add("participants.{$index}.team_id", __('Each team can be added only once.'));

                            continue;
                        }

                        if ($memberId > 0) {
                            $validator->errors()->add("participants.{$index}.member_id", __('Remove individual member and use lineup for team events.'));
                        }

                        if (count($playerIds) === 0) {
                            $validator->errors()->add("participants.{$index}.player_ids", __('Choose at least one player for team lineup.'));

                            continue;
                        }

                        $activePlayerIds = TeamMember::query()
                            ->where('team_id', $teamId)
                            ->where('session_id', $tournament->session_id)
                            ->whereNull('left_on')
                            ->whereIn('member_id', $playerIds)
                            ->pluck('member_id')
                            ->all();

                        if (count($activePlayerIds) !== count($playerIds)) {
                            $validator->errors()->add("participants.{$index}.player_ids", __('One or more selected players are not active in this team and session.'));
                        }

                        $teamRows++;
                        $usedTeamIds[] = $teamId;
                    } else {
                        if ($memberId <= 0) {
                            $validator->errors()->add("participants.{$index}.member_id", __('Member is required for individual events.'));

                            continue;
                        }

                        if (! empty($playerIds)) {
                            $validator->errors()->add("participants.{$index}.player_ids", __('Individual participants should not include lineup.'));
                        }

                        if ($teamId <= 0) {
                            $validator->errors()->add("participants.{$index}.team_id", __('Team is required for individual events.'));
                        } else {
                            $isActiveRosterMember = TeamMember::query()
                                ->where('member_id', $memberId)
                                ->where('team_id', $teamId)
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
                    }
                }

                if ($eventType === 'team' && $teamRows === 0) {
                    $validator->errors()->add('participants', __('Add at least one team with players.'));
                }
            },
        ];
    }
}
