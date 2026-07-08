<?php

declare(strict_types=1);

namespace App\Http\Requests\Members;

use App\Models\Event;
use App\Models\Member;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Tournament;
use App\Models\TournamentTier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreMemberAchievementFromContextRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('event_type') === '') {
            $this->merge(['event_type' => 'individual']);
        }

        if (! $this->filled('reuse_mode')) {
            $this->merge(['reuse_mode' => 'auto']);
        }

        if ($this->input('participants_required') === '') {
            $this->merge(['participants_required' => null]);
        }

        if ($this->input('medal_position') === '') {
            $this->merge(['medal_position' => null]);
        }

        if ($this->input('position') === '') {
            $this->merge(['position' => null]);
        }

        $this->merge([
            'tournament_id' => $this->normalizeForeignKeyInput((string) ($this->input('tournament_id') ?? '')),
            'event_id' => $this->normalizeForeignKeyInput((string) ($this->input('event_id') ?? '')),
            'team_id' => $this->normalizeForeignKeyInput((string) ($this->input('team_id') ?? '')),
            'sport_id' => $this->normalizeForeignKeyInput((string) ($this->input('sport_id') ?? '')),
            'event_sport_id' => $this->normalizeForeignKeyInput((string) ($this->input('event_sport_id') ?? '')),
        ]);

        if ($this->input('medal_type') === '') {
            $this->merge(['medal_type' => null]);
        }

        if (! $this->filled('is_historical_session')) {
            $this->merge(['is_historical_session' => false]);
        } else {
            $this->merge(['is_historical_session' => (bool) $this->input('is_historical_session')]);
        }

        if (
            ! (bool) $this->input('is_historical_session')
            && $this->filled('session_id')
            && (int) $this->input('session_id') > 0
        ) {
            $sessionIsCurrent = (bool) SportSession::query()
                ->where('organization_id', (int) $this->user()->organization_id)
                ->where('id', (int) $this->input('session_id'))
                ->value('is_current');

            if (! $sessionIsCurrent) {
                $this->merge(['is_historical_session' => true]);
            }
        }

        if (! $this->filled('allow_inactive_member')) {
            $this->merge(['allow_inactive_member' => false]);
        } else {
            $this->merge([
                'allow_inactive_member' => (bool) $this->input('allow_inactive_member'),
            ]);
        }

        if ($this->input('session_name') === '') {
            $this->merge(['session_name' => null]);
        }

        $this->merge([
            'session_id' => $this->normalizeForeignKeyInput((string) ($this->input('session_id') ?? '')),
            'tier_id' => $this->normalizeForeignKeyInput((string) ($this->input('tier_id') ?? '')),
        ]);

        $teamId = (int) ($this->input('team_id') ?? 0);
        $teamSessionId = (int) (Team::query()->find($teamId)?->session_id ?? 0);

        if ($teamId > 0 && ! $this->filled('session_id') && $teamSessionId > 0) {
            $this->merge(['session_id' => (string) $teamSessionId]);
        }

        if ($this->input('session_start_year') === '') {
            $this->merge(['session_start_year' => null]);
        }

        if ($this->input('session_end_year') === '') {
            $this->merge(['session_end_year' => null]);
        }

        if (! $this->filled('team_auto_resolved')) {
            $this->merge(['team_auto_resolved' => false]);
        } else {
            $this->merge([
                'team_auto_resolved' => (bool) $this->input('team_auto_resolved'),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orgId = (int) $this->user()->organization_id;

        return [
            'tournament_id' => ['nullable', 'integer', Rule::exists('tournaments', 'id')->where('organization_id', $orgId)],
            'event_id' => ['nullable', 'integer', Rule::exists('events', 'id')],
            'session_id' => ['nullable', 'integer', Rule::exists('sport_sessions', 'id')->where('organization_id', $orgId)],
            'session_name' => ['nullable', 'string', 'max:255'],
            'session_start_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'session_end_year' => ['nullable', 'integer', 'min:2000', 'max:2100', 'gt:session_start_year'],
            'tier_id' => ['nullable', 'required_without:tournament_id', 'integer', Rule::exists('tournament_tiers', 'id')],
            'is_historical_session' => ['nullable', 'boolean'],
            'allow_inactive_member' => ['nullable', 'boolean'],
            'sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'venue' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'tournament_name' => ['required_without:tournament_id', 'string', 'max:255'],
            'event_name' => ['required', 'string', 'max:255'],
            'event_sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('organization_id', $orgId)],
            'event_type' => ['required', 'in:individual,team'],
            'participants_required' => ['nullable', 'integer', 'min:1'],
            'discipline' => ['nullable', 'string', 'max:255'],
            'weight_category' => ['nullable', 'string', 'max:100'],
            'gender_class' => ['required', 'in:M,F,MIXED,OPEN'],
            'provisional_reason' => ['nullable', 'string', 'max:1000'],
            'position' => ['nullable', 'integer', 'min:1'],
            'medal_type' => ['nullable', Rule::in(['GOLD', 'SILVER', 'BRONZE', 'MERIT'])],
            'medal_position' => ['nullable', 'integer', 'min:1'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'team_id' => ['nullable', 'integer', Rule::exists('teams', 'id')->where('organization_id', $orgId)],
            'team_auto_resolved' => ['nullable', 'boolean'],
            'reuse_mode' => ['required', Rule::in(['auto', 'manual'])],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $member = $this->route('member');
                $eventType = (string) $this->input('event_type', 'individual');
                $tierId = (int) ($this->input('tier_id') ?? 0);
                $allowInactiveMember = (bool) $this->input('allow_inactive_member', false);
                $isHistorical =
                    (bool) $this->input('is_historical_session', false)
                    || (! $this->filled('session_id') && $this->filled('session_name'));

                if (
                    $isHistorical
                    && ! is_string($this->input('session_name'))
                    && ! $this->filled('session_id')
                    && (int) $this->input('team_id') <= 0
                ) {
                    $validator->errors()->add('session_name', __('Session name is required for historical session.'));
                }

                if ($tierId > 0 && TournamentTier::query()->find($tierId) === null) {
                    $validator->errors()->add('tier_id', __('Selected tier does not exist.'));
                }

                $tournament = null;
                if ($this->input('tournament_id')) {
                    $tournament = Tournament::query()->find((int) $this->input('tournament_id'));
                    $sessionIdFromInput = (int) $this->input('session_id');
                    $requiredOrg = (int) $this->user()->organization_id;

                    if ($tournament && (int) $tournament->organization_id !== $requiredOrg) {
                        $validator->errors()->add('tournament_id', __('Selected tournament does not belong to your organization.'));
                    }

                    if ($tournament && $sessionIdFromInput > 0 && (int) $tournament->session_id !== $sessionIdFromInput) {
                        $validator->errors()->add('session_id', __('Tournament session does not match selected session.'));
                    }

                    if (
                        $tournament
                        && ($this->input('tier_id') !== null)
                        && (int) $tournament->tier_id !== (int) $this->input('tier_id')
                    ) {
                        $validator->errors()->add('tier_id', __('Tournament tier does not match selected tier.'));
                    }
                }

                if ($this->input('event_id')) {
                    $event = Event::query()->find((int) $this->input('event_id'));
                    $tournamentId = (int) $this->input('tournament_id');

                    if ($event && $tournamentId > 0 && (int) $event->tournament_id !== $tournamentId) {
                        $validator->errors()->add('event_id', __('Selected event does not belong to selected tournament.'));
                    }
                }

                $eventSportId = (int) $this->input('event_sport_id');
                $tournamentSportId = (int) ($this->input('sport_id') ?? 0);

                if ($eventSportId <= 0 && $tournamentSportId <= 0) {
                    if (! $this->input('tournament_id')) {
                        $validator->errors()->add('event_sport_id', __('Choose a sport for this event.'));
                    } elseif ((int) ($tournament?->sport_id ?? 0) <= 0) {
                        $validator->errors()->add('event_sport_id', __('Choose an event sport for this context.'));
                    }
                }

                $medalType = strtoupper((string) $this->input('medal_type', ''));
                $position = $this->input('position');

                if ($medalType === 'MERIT') {
                    if ($position === null || $position === '') {
                        $validator->errors()->add('position', __('Merit medal needs a position.'));
                    } elseif (! is_numeric($position) || ! in_array((int) $position, [1, 2, 3], true)) {
                        $validator->errors()->add('position', __('Position must be 1, 2, or 3 for merit medals.'));
                    }
                }

                $teamId = (int) $this->input('team_id');
                $sessionId = (int) ($this->input('session_id') ?: ($tournament?->session_id ?? 0));
                $eventSportId = (int) ($this->input('event_sport_id') ?: $this->input('sport_id', 0));
                $selectedTeam = $teamId > 0 ? Team::query()->find($teamId) : null;
                $teamSessionId = (int) ($selectedTeam?->session_id ?? 0);

                if ($teamId > 0 && $sessionId <= 0 && $teamSessionId > 0) {
                    $sessionId = $teamSessionId;
                    $this->merge(['session_id' => $sessionId]);
                }
                $selectedSessionId = (int) ($this->input('session_id') ?: 0);
                $historicalWithSession = $this->isSessionHistorical($selectedSessionId, $isHistorical);
                $autoTeamId = $this->resolvedAutoTeamId($historicalWithSession);

                if ($member instanceof Member && ! $allowInactiveMember && $member->current_status !== 'ACTIVE') {
                    if ($isHistorical) {
                        $validator->errors()->add(
                            'session_name',
                            __('Inactive member cannot be added to historical contexts unless allow inactive is enabled.'),
                        );
                    } else {
                        $validator->errors()->add(
                            'session_id',
                            __('Inactive member cannot be added to event context unless allow inactive is enabled.'),
                        );
                    }
                }

                if ($eventType === 'team') {
                    if ($teamId <= 0 && $autoTeamId !== null) {
                        $this->merge([
                            'team_id' => $autoTeamId,
                            'team_auto_resolved' => true,
                        ]);
                        $teamId = $autoTeamId;
                    }

                    if ($teamId <= 0 && ! $historicalWithSession) {
                        $validator->errors()->add('team_id', __('Team is required for team events.'));
                    }

                    if ($teamId > 0 && $sessionId > 0) {
                        $teamSportMatchQuery = Team::query()
                            ->where('id', $teamId)
                            ->where('organization_id', $this->user()->organization_id)
                            ->where('sport_id', $eventSportId)
                            ->where('session_id', $sessionId);

                        if (! $historicalWithSession) {
                            $teamSportMatchQuery->where('is_active', true);
                        }

                        if (! $teamSportMatchQuery->exists()) {
                            $validator->errors()->add(
                                'team_id',
                                __('Selected team is not available for this sport and session.'),
                            );
                        }
                    } elseif ($teamId > 0) {
                        if ($selectedTeam === null) {
                            $validator->errors()->add('team_id', __('Selected team does not exist.'));
                        } else {
                            if (! $historicalWithSession) {
                                $validator->errors()->add('session_id', __('Session is required to validate the selected team.'));
                            }
                        }
                    }

                    return;
                }

                if (! $member instanceof Member) {
                    return;
                }

                if ($sessionId <= 0 && $teamId <= 0 && ! $historicalWithSession && $autoTeamId === null) {
                    $validator->errors()->add(
                        'session_id',
                        __('Session context is required to auto-assign team for individual events.'),
                    );
                }

                if ($teamId > 0) {
                    $teamSportMatchQuery = Team::query()
                        ->where('id', $teamId)
                        ->where('organization_id', $this->user()->organization_id)
                        ->where('sport_id', $eventSportId)
                        ->where('session_id', $sessionId);

                    if (! $historicalWithSession) {
                        $teamSportMatchQuery->where('is_active', true);
                    }

                    if (! $teamSportMatchQuery->exists()) {
                        $validator->errors()->add(
                            'team_id',
                            __('Selected team is not available for this sport and session.'),
                        );
                    }

                    return;
                }

                if ($autoTeamId !== null) {
                    $this->merge([
                        'team_id' => $autoTeamId,
                        'team_auto_resolved' => true,
                    ]);
                    $resolvedAutoSession = (int) Team::query()->whereKey($autoTeamId)->value('session_id');
                    if ($resolvedAutoSession > 0) {
                        $this->merge(['session_id' => $resolvedAutoSession]);
                    }

                    return;
                }

                $teamCandidatesCount = Team::query()
                    ->where('organization_id', $this->user()->organization_id)
                    ->where('sport_id', $eventSportId)
                    ->where('session_id', $sessionId)
                    ->when(! $historicalWithSession, function ($query): void {
                        $query->where('is_active', true);
                    })
                    ->count();

                if ($historicalWithSession) {
                    if ($teamCandidatesCount === 0) {
                        $this->merge([
                            'team_auto_resolved' => false,
                            'team_id' => '',
                        ]);
                    }

                    return;
                }

                if ($teamCandidatesCount === 0) {
                    $validator->errors()->add(
                        'team_id',
                        __('No active team found for this sport in selected session. Please select team manually.'),
                    );
                } elseif ($teamCandidatesCount > 1) {
                    $validator->errors()->add(
                        'team_id',
                        __('Multiple teams found for this sport and session. Please select a team manually.'),
                    );
                }
            },
        ];
    }

    public function resolvedAutoTeamId(bool $isHistorical = false): ?int
    {
        $eventType = (string) $this->input('event_type', 'individual');
        if (! in_array($eventType, ['individual', 'team'], true)) {
            return null;
        }

        $teamId = (int) ($this->input('team_id') ?: 0);
        if ($teamId > 0) {
            return $teamId;
        }

        $eventSportId = (int) ($this->input('event_sport_id') ?: $this->input('sport_id', 0));
        $tournament = Tournament::query()->find((int) $this->input('tournament_id'));
        $sessionId = (int) ($this->input('session_id') ?: ($tournament?->session_id ?? 0));
        if ($sessionId <= 0 || $eventSportId <= 0) {
            return null;
        }

        $historicalTeamId = $this->resolveHistoricalTeamFromMemberMembership($sessionId, $eventSportId, $isHistorical);
        if ($historicalTeamId !== null) {
            return $historicalTeamId;
        }

        $teamCandidates = Team::query()
            ->where('organization_id', (int) $this->user()->organization_id)
            ->where('sport_id', $eventSportId)
            ->where('session_id', $sessionId)
            ->when(! $isHistorical, function ($query): void {
                $query->where('is_active', true);
            })
            ->pluck('id');

        if ($teamCandidates->count() !== 1) {
            return null;
        }

        return (int) $teamCandidates->first();
    }

    private function resolveHistoricalTeamFromMemberMembership(int $sessionId, int $eventSportId, bool $allowInactive): ?int
    {
        $member = $this->route('member');
        if (! $member instanceof Member) {
            return null;
        }

        $query = TeamMember::query()
            ->where('member_id', $member->id)
            ->where('session_id', $sessionId)
            ->whereHas('team', static function ($teamQuery) use ($eventSportId): void {
                $teamQuery
                    ->where('sport_id', $eventSportId);
            });

        if (! $allowInactive) {
            $query->whereNull('left_on');
        }

        $teamIds = $query
            ->pluck('team_id')
            ->unique()
            ->values();

        if ($teamIds->count() !== 1) {
            return null;
        }

        return (int) $teamIds->first();
    }

    private function isSessionHistorical(int $sessionId, bool $isHistoricalFromInput): bool
    {
        if ($isHistoricalFromInput) {
            return true;
        }

        if ($sessionId <= 0) {
            return false;
        }

        return ! (bool) SportSession::query()
            ->where('organization_id', (int) $this->user()->organization_id)
            ->where('id', $sessionId)
            ->value('is_current');
    }

    private function normalizeForeignKeyInput(string $value): ?string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return preg_match('/^\d+$/', $trimmed) === 1
            ? (((int) $trimmed > 0) ? (string) (int) $trimmed : null)
            : null;
    }
}
