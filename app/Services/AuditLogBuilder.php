<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Achievement;
use App\Models\AuditLog;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\District;
use App\Models\Member;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Collection;

class AuditLogBuilder
{
    /**
     * Build the audit timeline for a member.
     *
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    public function forMember(Member $member): array
    {
        // ─── Collect live entity IDs ──────────────────────────────────────
        $statusHistoryIds = $member->statusHistory()->pluck('id');
        $aliasIds = $member->aliases()->pluck('id');
        $legacyAchIds = $member->legacyAchievements()->pluck('id');
        $teamMemberIds = TeamMember::where('member_id', $member->id)->pluck('id');

        $participations = Participation::where('member_id', $member->id)
            ->with(['event:id,name_hi,tournament_id', 'event.tournament:id,name_hi'])
            ->get();
        $participationIds = $participations->pluck('id');
        $achievementIds = $participationIds->isNotEmpty()
            ? Achievement::whereIn('participation_id', $participationIds)->pluck('id')
            : collect();

        // ─── Gather audit logs ────────────────────────────────────────────
        $logs = AuditLog::where('entity', 'Member')->where('entity_id', $member->id)->get();

        $directEntities = [
            ['entity' => 'MemberStatusHistory',     'ids' => $statusHistoryIds],
            ['entity' => 'NameAlias',               'ids' => $aliasIds],
            ['entity' => 'TeamMember',              'ids' => $teamMemberIds],
            ['entity' => 'Participation',           'ids' => $participationIds],
            ['entity' => 'MemberLegacyAchievement', 'ids' => $legacyAchIds],
        ];

        foreach ($directEntities as ['entity' => $entity, 'ids' => $ids]) {
            $logs = $logs->merge(
                AuditLog::where('entity', $entity)
                    ->whereIn('action', ['created', 'deleted'])
                    ->whereRaw("JSON_EXTRACT(diff, '$.member_id') = ?", [$member->id])
                    ->get()
            );
            if ($ids->isNotEmpty()) {
                $logs = $logs->merge(
                    AuditLog::where('entity', $entity)
                        ->where('action', 'updated')
                        ->whereIn('entity_id', $ids)
                        ->get()
                );
            }
        }

        if ($participationIds->isNotEmpty()) {
            $pidList = $participationIds->all();
            $holders = implode(',', array_fill(0, count($pidList), '?'));
            $logs = $logs->merge(
                AuditLog::where('entity', 'Achievement')
                    ->whereIn('action', ['created', 'deleted'])
                    ->whereRaw("JSON_EXTRACT(diff, '$.participation_id') IN ({$holders})", $pidList)
                    ->get()
            );
            if ($achievementIds->isNotEmpty()) {
                $logs = $logs->merge(
                    AuditLog::where('entity', 'Achievement')
                        ->where('action', 'updated')
                        ->whereIn('entity_id', $achievementIds)
                        ->get()
                );
            }
        }

        $allLogs = $logs->unique('id')->sortByDesc('at')->values();

        // ─── Label maps ───────────────────────────────────────────────────
        $sportMap = Sport::pluck('name_hi', 'id');
        $unitMap = Unit::pluck('name_hi', 'id');
        $districtMap = District::pluck('name_hi', 'id');
        $userMap = User::pluck('name', 'id');
        $teamMap = Team::pluck('name_hi', 'id');
        $sessionMap = SportSession::pluck('name', 'id');

        $eventLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->event_id => $p->event->name_hi.' · '.$p->event->tournament?->name_hi,
        ]);
        $participationLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->id => $p->event->name_hi.' · '.$p->event->tournament?->name_hi,
        ]);

        $subjectMap = [
            'Member' => 'Member',
            'MemberStatusHistory' => 'Status',
            'NameAlias' => 'Alias',
            'TeamMember' => 'Team membership',
            'Participation' => 'Tournament participation',
            'Achievement' => 'Achievement',
            'MemberLegacyAchievement' => 'Legacy achievement',
        ];

        $fieldLabelMap = [
            'Member' => [
                'full_name_hi' => 'Name (Hindi)',
                'full_name_en' => 'Name (English)',
                'father_name_hi' => "Father's name",
                'pno' => 'PNO',
                'rank' => 'Rank',
                'gender' => 'Gender',
                'dob' => 'Date of birth',
                'mobile' => 'Mobile',
                'current_status' => 'Status',
                'player_category' => 'Category',
                'player_level' => 'Level',
                'sport_id' => 'Sport',
                'sport_event' => 'Sport event',
                'current_unit_id' => 'Unit',
                'home_district_id' => 'Home district',
                'joining_date' => 'Joining date',
                'blood_group' => 'Blood group',
                'caste' => 'Caste',
                'recruitment_type' => 'Recruitment type',
                'appointment' => 'Appointment',
                'promotion_date' => 'Promotion date',
                'team_since' => 'Team since',
                'home_address' => 'Home address',
                'other_notes' => 'Other notes',
                'photo_path' => 'Photo',
            ],
            'MemberStatusHistory' => [
                'status' => 'Status',
                'effective_on' => 'Effective on',
                'reason_hi' => 'Reason',
                'recorded_by' => 'Recorded by',
            ],
            'NameAlias' => [
                'alias_hi' => 'Alias',
                'source' => 'Source',
            ],
            'TeamMember' => [
                'team_id' => 'Team',
                'session_id' => 'Session',
                'role' => 'Role',
                'joined_on' => 'Joined on',
                'left_on' => 'Left on',
            ],
            'Participation' => [
                'event_id' => 'Event',
                'session_id' => 'Session',
                'team_id' => 'Team',
                'position' => 'Position',
            ],
            'Achievement' => [
                'participation_id' => 'Event',
                'medal_type' => 'Medal',
                'position' => 'Position',
                'remarks' => 'Remarks',
            ],
            'MemberLegacyAchievement' => [
                'period' => 'Period',
                'level' => 'Level',
                'competition_details' => 'Competition',
                'event_date' => 'Event date',
                'venue' => 'Venue',
                'sport_discipline' => 'Sport discipline',
                'event' => 'Event',
                'medal_type' => 'Medal',
                'sort_order' => 'Sort order',
            ],
        ];

        $hiddenFields = [
            'Member' => ['id', 'organization_id', 'full_name_normalized', 'source_refs', 'deleted_at'],
            'MemberStatusHistory' => ['id', 'member_id'],
            'NameAlias' => ['id', 'member_id', 'alias_normalized'],
            'TeamMember' => ['id', 'member_id'],
            'Participation' => ['id', 'member_id'],
            'Achievement' => ['id'],
            'MemberLegacyAchievement' => ['id', 'organization_id', 'member_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value) use (
            $sportMap, $unitMap, $districtMap, $userMap,
            $teamMap, $sessionMap, $eventLabelMap, $participationLabelMap
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $entity === 'Member' && $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'current_unit_id' => $unitMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'home_district_id' => $districtMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'photo_path' => '✓',
                $field === 'team_id' => $teamMap->get((int) $value) ?? (string) $value,
                $field === 'session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'recorded_by' => $userMap->get((int) $value) ?? (string) $value,
                $field === 'event_id' => $eventLabelMap->get((int) $value) ?? (string) $value,
                $field === 'participation_id' => $participationLabelMap->get((int) $value) ?? (string) $value,
                default => (string) $value,
            };
        };

        return $this->mapLogs($allLogs, $subjectMap, $fieldLabelMap, $hiddenFields, $resolve, $userMap);
    }

    /**
     * Build the audit timeline for a team.
     *
     * Covers the team's own edits, player (TeamMember) assignments, and
     * coach (CoachAssignment) assignments.
     *
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    public function forTeam(Team $team): array
    {
        $teamMemberIds = TeamMember::where('team_id', $team->id)->pluck('id');
        $coachAssignmentIds = CoachAssignment::where('team_id', $team->id)->pluck('id');

        // Team own events
        $logs = AuditLog::where('entity', 'Team')->where('entity_id', $team->id)->get();

        // TeamMember events
        $logs = $logs->merge(
            AuditLog::where('entity', 'TeamMember')
                ->whereIn('action', ['created', 'deleted'])
                ->whereRaw("JSON_EXTRACT(diff, '$.team_id') = ?", [$team->id])
                ->get()
        );
        if ($teamMemberIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'TeamMember')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $teamMemberIds)
                    ->get()
            );
        }

        // CoachAssignment events
        $logs = $logs->merge(
            AuditLog::where('entity', 'CoachAssignment')
                ->whereIn('action', ['created', 'deleted'])
                ->whereRaw("JSON_EXTRACT(diff, '$.team_id') = ?", [$team->id])
                ->get()
        );
        if ($coachAssignmentIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'CoachAssignment')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $coachAssignmentIds)
                    ->get()
            );
        }

        $allLogs = $logs->unique('id')->sortByDesc('at')->values();

        $sportMap = Sport::pluck('name_hi', 'id');
        $unitMap = Unit::pluck('name_hi', 'id');
        $sessionMap = SportSession::pluck('name', 'id');
        $userMap = User::pluck('name', 'id');
        $memberMap = Member::withoutGlobalScopes()->pluck('full_name_hi', 'id');
        $coachMap = Coach::withoutGlobalScopes()->pluck('full_name_hi', 'id');

        $subjectMap = [
            'Team' => 'Team',
            'TeamMember' => 'Player',
            'CoachAssignment' => 'Coach assignment',
        ];

        $fieldLabelMap = [
            'Team' => [
                'name_hi' => 'Name',
                'sport_id' => 'Sport',
                'session_id' => 'Session',
                'unit_id' => 'Unit',
                'in_charge_hi' => 'In-charge',
            ],
            'TeamMember' => [
                'member_id' => 'Player',
                'session_id' => 'Session',
                'role' => 'Role',
                'joined_on' => 'Joined on',
                'left_on' => 'Left on',
            ],
            'CoachAssignment' => [
                'coach_id' => 'Coach',
                'session_id' => 'Session',
                'role' => 'Role',
            ],
        ];

        $hiddenFields = [
            'Team' => ['id', 'organization_id', 'deleted_at'],
            'TeamMember' => ['id', 'team_id'],
            'CoachAssignment' => ['id', 'team_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value) use (
            $sportMap, $unitMap, $sessionMap, $memberMap, $coachMap
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $field === 'unit_id' => $unitMap->get((int) $value) ?? (string) $value,
                $field === 'session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'member_id' => $memberMap->get((int) $value) ?? (string) $value,
                $field === 'coach_id' => $coachMap->get((int) $value) ?? (string) $value,
                default => (string) $value,
            };
        };

        return $this->mapLogs($allLogs, $subjectMap, $fieldLabelMap, $hiddenFields, $resolve, $userMap);
    }

    /**
     * Build the audit timeline for a coach.
     *
     * Covers the coach's own profile edits and all team assignments
     * (CoachAssignment created/updated/deleted).
     *
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    public function forCoach(Coach $coach): array
    {
        $coachAssignmentIds = CoachAssignment::where('coach_id', $coach->id)->pluck('id');

        $logs = AuditLog::where('entity', 'Coach')->where('entity_id', $coach->id)->get();

        $logs = $logs->merge(
            AuditLog::where('entity', 'CoachAssignment')
                ->whereIn('action', ['created', 'deleted'])
                ->whereRaw("JSON_EXTRACT(diff, '$.coach_id') = ?", [$coach->id])
                ->get()
        );
        if ($coachAssignmentIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'CoachAssignment')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $coachAssignmentIds)
                    ->get()
            );
        }

        $allLogs = $logs->unique('id')->sortByDesc('at')->values();

        $sessionMap = SportSession::pluck('name', 'id');
        $userMap = User::pluck('name', 'id');
        $teamMap = Team::pluck('name_hi', 'id');
        $memberMap = Member::withoutGlobalScopes()->pluck('full_name_hi', 'id');

        $subjectMap = [
            'Coach' => 'Coach',
            'CoachAssignment' => 'Team assignment',
        ];

        $fieldLabelMap = [
            'Coach' => [
                'full_name_hi' => 'Name (Hindi)',
                'full_name_en' => 'Name (English)',
                'pno' => 'PNO',
                'mobile' => 'Mobile',
                'nis_certified' => 'NIS certified',
                'member_id' => 'Linked member',
            ],
            'CoachAssignment' => [
                'team_id' => 'Team',
                'session_id' => 'Session',
                'role' => 'Role',
            ],
        ];

        $hiddenFields = [
            'Coach' => ['id', 'organization_id', 'deleted_at'],
            'CoachAssignment' => ['id', 'coach_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value) use (
            $sessionMap, $teamMap, $memberMap
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $field === 'session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'team_id' => $teamMap->get((int) $value) ?? (string) $value,
                $field === 'member_id' => $memberMap->get((int) $value) ?? (string) $value,
                default => (string) $value,
            };
        };

        return $this->mapLogs($allLogs, $subjectMap, $fieldLabelMap, $hiddenFields, $resolve, $userMap);
    }

    /**
     * Map raw AuditLog collection to the frontend-consumable shape.
     *
     * @param  Collection<int, AuditLog>  $logs
     * @param  array<string, string>  $subjectMap
     * @param  array<string, array<string, string>>  $fieldLabelMap
     * @param  array<string, list<string>>  $hiddenFields
     * @param  callable(string, string, mixed): ?string  $resolve
     * @param  Collection<int, string>  $userMap
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    private function mapLogs(
        Collection $logs,
        array $subjectMap,
        array $fieldLabelMap,
        array $hiddenFields,
        callable $resolve,
        Collection $userMap,
    ): array {
        return $logs->map(function (AuditLog $log) use (
            $subjectMap, $fieldLabelMap, $hiddenFields, $resolve, $userMap
        ): array {
            $entity = $log->entity;
            $diff = $log->diff ?? [];
            $changes = [];
            $subject = $subjectMap[$entity] ?? $entity;
            $labels = $fieldLabelMap[$entity] ?? [];
            $hidden = $hiddenFields[$entity] ?? [];

            if ($log->action === 'updated' && isset($diff['old'], $diff['new'])) {
                foreach ($diff['new'] as $field => $newVal) {
                    $oldVal = $diff['old'][$field] ?? null;
                    $changes[] = [
                        'field' => $labels[$field] ?? $field,
                        'old' => $resolve($entity, $field, $oldVal),
                        'new' => $resolve($entity, $field, $newVal),
                    ];
                }
            } else {
                $isDeleted = $log->action === 'deleted';
                foreach ($diff as $field => $value) {
                    if (in_array($field, $hidden, true) || $value === null || $value === '') {
                        continue;
                    }
                    $resolved = $resolve($entity, $field, $value);
                    $changes[] = [
                        'field' => $labels[$field] ?? $field,
                        'old' => $isDeleted ? $resolved : null,
                        'new' => $isDeleted ? null : $resolved,
                    ];
                }
            }

            return [
                'id' => $log->id,
                'action' => $log->action,
                'subject' => $subject,
                'at' => $log->at->toIso8601String(),
                'by' => $log->user_id ? ($userMap->get($log->user_id) ?? '#'.$log->user_id) : null,
                'changes' => $changes,
            ];
        })->all();
    }
}
