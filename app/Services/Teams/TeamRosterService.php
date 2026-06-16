<?php

declare(strict_types=1);

namespace App\Services\Teams;

use App\Models\Member;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamMemberMovement;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TeamRosterService
{
    private const ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'];

    /**
     * @param  list<int|string>  $memberIds
     */
    public function addMembers(
        Team $team,
        array $memberIds,
        int $sessionId,
        string $role,
        ?string $joinedOn,
        int $userId,
    ): int {
        $entries = collect($memberIds)
            ->values()
            ->map(fn (int|string $memberId, int $index): array => [
                'index' => $index,
                'member_id' => (int) $memberId,
                'role' => $role,
                'joined_on' => $joinedOn,
                'left_on' => null,
                'reason' => null,
            ])
            ->all();

        $preview = $this->previewEntries(
            team: $team,
            sessionId: $sessionId,
            entries: $entries,
            allowInactive: false,
            allowExistingRemoved: true,
        );

        $errors = $this->errorsForMemberInputs($preview['rows']);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return DB::transaction(function () use ($team, $preview, $sessionId, $role, $joinedOn, $userId): int {
            $count = 0;

            foreach ($preview['rows'] as $row) {
                $teamMember = TeamMember::updateOrCreate([
                    'team_id' => $team->id,
                    'member_id' => $row['member_id'],
                    'session_id' => $sessionId,
                ], [
                    'role' => $role,
                    'joined_on' => $joinedOn,
                    'left_on' => null,
                ]);

                $this->recordMovement(
                    team: $team,
                    teamMember: $teamMember,
                    memberId: (int) $row['member_id'],
                    sessionId: $sessionId,
                    action: 'ADDED',
                    role: $role,
                    effectiveOn: $joinedOn,
                    userId: $userId,
                    source: 'manual',
                );

                $count++;
            }

            return $count;
        });
    }

    /**
     * @param  list<int|string>  $memberIds
     */
    public function removeMembers(
        Team $team,
        array $memberIds,
        int $sessionId,
        string $leftOn,
        string $reason,
        int $userId,
        string $source = 'manual',
    ): int {
        return DB::transaction(function () use ($team, $memberIds, $sessionId, $leftOn, $reason, $userId, $source): int {
            $rows = TeamMember::where('team_id', $team->id)
                ->where('session_id', $sessionId)
                ->whereNull('left_on')
                ->whereIn('member_id', array_map('intval', $memberIds))
                ->get();

            foreach ($rows as $row) {
                $row->update(['left_on' => $leftOn]);

                $this->recordMovement(
                    team: $team,
                    teamMember: $row,
                    memberId: $row->member_id,
                    sessionId: $row->session_id,
                    action: 'REMOVED',
                    role: $row->role,
                    effectiveOn: $leftOn,
                    userId: $userId,
                    reason: $reason,
                    source: $source,
                );
            }

            return $rows->count();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{rows: list<array<string, mixed>>, summary: array{ready: int, warning: int, blocked: int, total: int}}
     */
    public function previewBackfill(Team $team, int $sessionId, array $data): array
    {
        return $this->previewEntries(
            team: $team,
            sessionId: $sessionId,
            entries: $this->entriesFromBackfillPayload($data),
            allowInactive: true,
            allowExistingRemoved: false,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{applied: int, skipped: int, batch_uuid: string, preview: array{rows: list<array<string, mixed>>, summary: array{ready: int, warning: int, blocked: int, total: int}}}
     */
    public function applyBackfill(Team $team, int $sessionId, array $data, int $userId): array
    {
        $preview = $this->previewBackfill($team, $sessionId, $data);
        $batchUuid = (string) Str::uuid();

        $applied = DB::transaction(function () use ($team, $sessionId, $preview, $userId, $batchUuid): int {
            $count = 0;

            foreach ($preview['rows'] as $row) {
                if (! in_array($row['status'], ['ready', 'warning'], true)) {
                    continue;
                }

                $teamMember = TeamMember::create([
                    'team_id' => $team->id,
                    'member_id' => $row['member_id'],
                    'session_id' => $sessionId,
                    'role' => $row['role'],
                    'joined_on' => $row['joined_on'],
                    'left_on' => $row['left_on'],
                ]);

                $this->recordMovement(
                    team: $team,
                    teamMember: $teamMember,
                    memberId: (int) $row['member_id'],
                    sessionId: $sessionId,
                    action: 'ADDED',
                    role: (string) $row['role'],
                    effectiveOn: $row['joined_on'],
                    userId: $userId,
                    reason: $row['status'] === 'warning' ? implode(' ', $row['messages']) : null,
                    source: 'backfill',
                    batchUuid: $batchUuid,
                    metadata: ['preview_status' => $row['status'], 'messages' => $row['messages']],
                );

                if (filled($row['left_on'])) {
                    $this->recordMovement(
                        team: $team,
                        teamMember: $teamMember,
                        memberId: (int) $row['member_id'],
                        sessionId: $sessionId,
                        action: 'REMOVED',
                        role: (string) $row['role'],
                        effectiveOn: $row['left_on'],
                        userId: $userId,
                        reason: $row['reason'],
                        source: 'backfill',
                        batchUuid: $batchUuid,
                        metadata: ['preview_status' => $row['status'], 'messages' => $row['messages']],
                    );
                }

                $count++;
            }

            return $count;
        });

        return [
            'applied' => $applied,
            'skipped' => $preview['summary']['blocked'],
            'batch_uuid' => $batchUuid,
            'preview' => $preview,
        ];
    }

    /**
     * @param  EloquentCollection<int, TeamMember>  $sourceRows
     * @return array{added: int, skipped: int}
     */
    public function carryForwardMembers(Team $team, EloquentCollection $sourceRows, int $targetSessionId, int $userId): array
    {
        $entries = $sourceRows
            ->values()
            ->map(fn (TeamMember $row, int $index): array => [
                'index' => $index,
                'member_id' => $row->member_id,
                'role' => $row->role,
                'joined_on' => $row->joined_on?->toDateString(),
                'left_on' => null,
                'reason' => null,
            ])
            ->all();

        $preview = $this->previewEntries(
            team: $team,
            sessionId: $targetSessionId,
            entries: $entries,
            allowInactive: false,
            allowExistingRemoved: false,
        );

        return DB::transaction(function () use ($team, $targetSessionId, $userId, $preview): array {
            $added = 0;
            $skipped = 0;

            foreach ($preview['rows'] as $row) {
                if ($row['status'] === 'blocked') {
                    if ($row['member_id']) {
                        $this->recordMovement(
                            team: $team,
                            teamMember: null,
                            memberId: (int) $row['member_id'],
                            sessionId: $targetSessionId,
                            action: 'SKIPPED',
                            role: $row['role'],
                            effectiveOn: now()->toDateString(),
                            userId: $userId,
                            reason: implode(' ', $row['messages']),
                            source: 'carry_forward',
                            metadata: ['messages' => $row['messages']],
                        );
                    }

                    $skipped++;

                    continue;
                }

                $teamMember = TeamMember::create([
                    'team_id' => $team->id,
                    'member_id' => $row['member_id'],
                    'session_id' => $targetSessionId,
                    'role' => $row['role'],
                    'joined_on' => $row['joined_on'],
                    'left_on' => null,
                ]);

                $this->recordMovement(
                    team: $team,
                    teamMember: $teamMember,
                    memberId: (int) $row['member_id'],
                    sessionId: $targetSessionId,
                    action: 'CARRIED_FORWARD',
                    role: (string) $row['role'],
                    effectiveOn: $row['joined_on'],
                    userId: $userId,
                    source: 'carry_forward',
                );

                $added++;
            }

            return ['added' => $added, 'skipped' => $skipped];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array<string, mixed>>
     */
    private function entriesFromBackfillPayload(array $data): array
    {
        $defaultRole = (string) ($data['role'] ?? 'PLAYER');
        $defaultJoinedOn = $data['joined_on'] ?? null;
        $defaultLeftOn = $data['left_on'] ?? null;
        $defaultReason = $data['reason'] ?? null;
        $entries = [];

        foreach (($data['member_ids'] ?? []) as $memberId) {
            $entries[] = [
                'index' => count($entries),
                'member_id' => (int) $memberId,
                'role' => $defaultRole,
                'joined_on' => $defaultJoinedOn,
                'left_on' => $defaultLeftOn,
                'reason' => $defaultReason,
            ];
        }

        foreach (preg_split('/\R/u', (string) ($data['paste'] ?? '')) ?: [] as $lineNumber => $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            $columns = array_map('trim', preg_split('/[\t|,]+/u', $line) ?: []);

            $entries[] = [
                'index' => count($entries),
                'line_number' => $lineNumber + 1,
                'lookup' => $columns[0] ?? '',
                'role' => ($columns[1] ?? '') !== '' ? $columns[1] : $defaultRole,
                'joined_on' => ($columns[2] ?? '') !== '' ? $columns[2] : $defaultJoinedOn,
                'left_on' => ($columns[3] ?? '') !== '' ? $columns[3] : $defaultLeftOn,
                'reason' => ($columns[4] ?? '') !== '' ? implode(', ', array_slice($columns, 4)) : $defaultReason,
            ];
        }

        return $entries;
    }

    /**
     * @param  list<array<string, mixed>>  $entries
     * @return array{rows: list<array<string, mixed>>, summary: array{ready: int, warning: int, blocked: int, total: int}}
     */
    private function previewEntries(
        Team $team,
        int $sessionId,
        array $entries,
        bool $allowInactive,
        bool $allowExistingRemoved,
    ): array {
        $rows = [];
        $seenMemberIds = [];

        foreach ($entries as $entry) {
            $row = $this->evaluateEntry($team, $sessionId, $entry, $allowInactive, $allowExistingRemoved);

            if ($row['member_id'] && in_array($row['member_id'], $seenMemberIds, true)) {
                $row['messages'][] = __('This member appears more than once in the submitted roster.');
                $row['status'] = 'blocked';
            }

            if ($row['member_id']) {
                $seenMemberIds[] = $row['member_id'];
            }

            $rows[] = $row;
        }

        return [
            'rows' => $rows,
            'summary' => [
                'ready' => collect($rows)->where('status', 'ready')->count(),
                'warning' => collect($rows)->where('status', 'warning')->count(),
                'blocked' => collect($rows)->where('status', 'blocked')->count(),
                'total' => count($rows),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $entry
     * @return array<string, mixed>
     */
    private function evaluateEntry(
        Team $team,
        int $sessionId,
        array $entry,
        bool $allowInactive,
        bool $allowExistingRemoved,
    ): array {
        $messages = [];
        $status = 'ready';
        $member = $this->resolveMember($team, $entry);
        $role = (string) ($entry['role'] ?? 'PLAYER');
        $joinedOn = $this->blankToNull($entry['joined_on'] ?? null);
        $leftOn = $this->blankToNull($entry['left_on'] ?? null);
        $reason = $this->blankToNull($entry['reason'] ?? null);

        if (! in_array($role, self::ROLES, true)) {
            $messages[] = __('Role must be PLAYER, CAPTAIN, or RESERVE.');
            $status = 'blocked';
        }

        if (! $member) {
            $messages[] = __('No member matched this PNO or member code.');

            return $this->previewRow($entry, null, $role, $joinedOn, $leftOn, $reason, 'blocked', $messages);
        }

        if ($member->current_status !== 'ACTIVE') {
            if ($allowInactive) {
                $messages[] = __('Historical backfill will record this member even though their current status is :status.', [
                    'status' => $member->current_status,
                ]);
                $status = $status === 'blocked' ? 'blocked' : 'warning';
            } else {
                $messages[] = __('This member is not active.');
                $status = 'blocked';
            }
        }

        if (! $member->playableSports()->where('sports.id', $team->sport_id)->exists()) {
            $messages[] = __('This member is not eligible for this team sport.');
            $status = 'blocked';
        }

        $existingTeamRow = TeamMember::where('team_id', $team->id)
            ->where('member_id', $member->id)
            ->where('session_id', $sessionId)
            ->first();

        if ($existingTeamRow?->left_on === null && $existingTeamRow !== null) {
            $messages[] = __('This member is already active on this team for the selected session.');
            $status = 'blocked';
        } elseif ($existingTeamRow !== null && ! $allowExistingRemoved) {
            $messages[] = __('This member already has roster history for this team and session.');
            $status = 'blocked';
        }

        $sameSportConflict = TeamMember::with('team:id,name,sport_id')
            ->where('session_id', $sessionId)
            ->where('member_id', $member->id)
            ->whereNull('left_on')
            ->where('team_id', '!=', $team->id)
            ->whereHas('team', fn ($query) => $query->where('sport_id', $team->sport_id))
            ->first();

        if ($sameSportConflict) {
            $messages[] = __('This member is already assigned to team :team for this sport and session.', [
                'team' => $sameSportConflict->team?->name,
            ]);
            $status = 'blocked';
        }

        if ($leftOn && ! $reason) {
            $messages[] = __('Removal reason is required when left on is provided.');
            $status = 'blocked';
        }

        if (! $this->dateIsValid($joinedOn) || ! $this->dateIsValid($leftOn)) {
            $messages[] = __('Roster dates must be valid dates.');
            $status = 'blocked';
        } elseif (! $this->datesAreValid($joinedOn, $leftOn)) {
            $messages[] = __('Left on must be on or after joined on.');
            $status = 'blocked';
        }

        return $this->previewRow($entry, $member, $role, $joinedOn, $leftOn, $reason, $status, $messages);
    }

    /**
     * @param  array<string, mixed>  $entry
     * @param  list<string>  $messages
     * @return array<string, mixed>
     */
    private function previewRow(
        array $entry,
        ?Member $member,
        string $role,
        ?string $joinedOn,
        ?string $leftOn,
        ?string $reason,
        string $status,
        array $messages,
    ): array {
        return [
            'index' => $entry['index'] ?? 0,
            'line_number' => $entry['line_number'] ?? null,
            'lookup' => $entry['lookup'] ?? $member?->pno ?? $member?->member_code,
            'member_id' => $member?->id,
            'full_name' => $member?->full_name,
            'pno' => $member?->pno,
            'member_code' => $member?->member_code,
            'current_status' => $member?->current_status,
            'role' => $role,
            'joined_on' => $joinedOn,
            'left_on' => $leftOn,
            'reason' => $reason,
            'status' => $status,
            'messages' => $messages,
        ];
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function resolveMember(Team $team, array $entry): ?Member
    {
        if (! empty($entry['member_id'])) {
            return Member::where('organization_id', $team->organization_id)
                ->where('id', (int) $entry['member_id'])
                ->first();
        }

        $lookup = trim((string) ($entry['lookup'] ?? ''));

        if ($lookup === '') {
            return null;
        }

        $member = Member::where('organization_id', $team->organization_id)
            ->where(function ($query) use ($lookup): void {
                $query->where('pno', $lookup)
                    ->orWhere('member_code', $lookup);
            })
            ->first();

        if ($member || ! ctype_digit($lookup)) {
            return $member;
        }

        return Member::where('organization_id', $team->organization_id)
            ->where('id', (int) $lookup)
            ->first();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, string>
     */
    private function errorsForMemberInputs(array $rows): array
    {
        $errors = [];

        foreach ($rows as $row) {
            if ($row['status'] === 'blocked') {
                $errors['member_ids.'.((int) $row['index'])] = implode(' ', $row['messages']);
            }
        }

        return $errors;
    }

    private function blankToNull(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === '' || $value === null ? null : (string) $value;
    }

    private function datesAreValid(?string $joinedOn, ?string $leftOn): bool
    {
        if (! $joinedOn || ! $leftOn) {
            return true;
        }

        return Carbon::parse($leftOn)->greaterThanOrEqualTo(Carbon::parse($joinedOn));
    }

    private function dateIsValid(?string $date): bool
    {
        if (! $date) {
            return true;
        }

        try {
            Carbon::parse($date);
        } catch (\Throwable) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, mixed>|null  $metadata
     */
    private function recordMovement(
        Team $team,
        ?TeamMember $teamMember,
        int $memberId,
        int $sessionId,
        string $action,
        ?string $role,
        ?string $effectiveOn,
        int $userId,
        ?string $reason = null,
        string $source = 'manual',
        ?string $batchUuid = null,
        ?array $metadata = null,
    ): void {
        TeamMemberMovement::create([
            'team_id' => $team->id,
            'member_id' => $memberId,
            'session_id' => $sessionId,
            'team_member_id' => $teamMember?->id,
            'created_by' => $userId,
            'action' => $action,
            'role' => $role,
            'effective_on' => $effectiveOn ?: now()->toDateString(),
            'reason' => $reason,
            'source' => $source,
            'batch_uuid' => $batchUuid,
            'metadata' => $metadata,
        ]);
    }
}
