<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Achievement;
use App\Models\AuditLog;
use App\Models\Coach;
use App\Models\CoachAlias;
use App\Models\CoachAssignment;
use App\Models\CoachCertification;
use App\Models\CoachPlayingAchievement;
use App\Models\CoachPromotion;
use App\Models\CoachPromotionEvidence;
use App\Models\CoachSpecialAchievement;
use App\Models\CoachSport;
use App\Models\CoachStatusHistory;
use App\Models\District;
use App\Models\Event;
use App\Models\Incharge;
use App\Models\InchargeAchievement;
use App\Models\InchargeSpecialAchievement;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\MemberSpecialAchievement;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\TeamMember;
use App\Models\TeamSessionStatus;
use App\Models\Tournament;
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
        $specialAchIds = $member->specialAchievements()->pluck('id');
        $promotionIds = MemberPromotion::where('member_id', $member->id)->pluck('id');
        $promotionEvidenceIds = PromotionEvidence::whereHas('memberPromotion', fn ($q) => $q->where('member_id', $member->id))->pluck('id');
        $teamMemberIds = TeamMember::where('member_id', $member->id)->pluck('id');
        $playableSportIds = $member->playableSports()->pluck('sports.id');

        $participations = Participation::where('member_id', $member->id)
            ->with(['event:id,name,tournament_id', 'event.tournament:id,name'])
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
            ['entity' => 'MemberSpecialAchievement', 'ids' => $specialAchIds],
            ['entity' => 'MemberPromotion',         'ids' => $promotionIds],
            ['entity' => 'PromotionEvidence',       'ids' => $promotionEvidenceIds],
            ['entity' => 'MemberSport',             'ids' => $playableSportIds],
        ];

        foreach ($directEntities as ['entity' => $entity, 'ids' => $ids]) {
            $createdDeletedQuery = AuditLog::where('entity', $entity)
                ->whereIn('action', ['created', 'deleted']);

            if ($entity === 'PromotionEvidence') {
                if ($promotionIds->isNotEmpty()) {
                    $createdDeletedQuery->whereIn('diff->member_promotion_id', $promotionIds->all());
                } else {
                    $createdDeletedQuery->whereRaw('0 = 1');
                }
            } else {
                $createdDeletedQuery->where('diff->member_id', $member->id);
            }

            $logs = $logs->merge($createdDeletedQuery->get());
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
            $logs = $logs->merge(
                AuditLog::where('entity', 'Achievement')
                    ->whereIn('action', ['created', 'deleted'])
                    ->whereIn('diff->participation_id', $participationIds)
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
        $sportMap = Sport::pluck('name', 'id');
        $unitMap = Unit::pluck('name', 'id');
        $districtMap = District::pluck('name', 'id');
        $userMap = User::pluck('name', 'id');
        $teamMap = Team::pluck('name', 'id');
        $sessionMap = SportSession::pluck('name', 'id');

        $eventLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->event_id => $p->event->name.' · '.$p->event->tournament?->name,
        ]);
        $participationLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->id => $p->event->name.' · '.$p->event->tournament?->name,
        ]);
        $achievementLabelMap = $achievementIds->isNotEmpty()
            ? Achievement::whereIn('id', $achievementIds)
                ->with(['participation.event.tournament'])
                ->get()
                ->mapWithKeys(fn (Achievement $achievement) => [
                    $achievement->id => collect([
                        $achievement->medal_type,
                        $achievement->participation?->event?->name,
                        $achievement->participation?->event?->tournament?->name,
                        $achievement->position ? '#'.$achievement->position : null,
                    ])->filter()->join(' · '),
                ])
            : collect();
        $specialAchievementLabelMap = $specialAchIds->isNotEmpty()
            ? MemberSpecialAchievement::whereIn('id', $specialAchIds)
                ->get()
                ->mapWithKeys(fn (MemberSpecialAchievement $achievement) => [
                    $achievement->id => collect([
                        $achievement->achievement_type,
                        $achievement->title,
                        $achievement->order_reference,
                    ])->filter()->join(' · '),
                ])
            : collect();
        $normaliseEvidenceType = fn (?string $type): ?string => match ($type) {
            'participation', Participation::class => 'participation',
            'achievement', Achievement::class => 'achievement',
            default => $type,
        };
        $evidenceTypeLabel = fn (mixed $value): string => match ($normaliseEvidenceType(is_string($value) ? $value : null)) {
            'participation' => 'Tournament participation',
            'achievement' => 'Achievement',
            default => is_string($value) ? class_basename($value) : (string) $value,
        };
        $resolveEvidenceLabel = function (mixed $value, array $diff = []) use (
            $normaliseEvidenceType,
            $participationLabelMap,
            $achievementLabelMap,
        ): string {
            $type = $diff['evidencable_type']
                ?? $diff['new']['evidencable_type']
                ?? $diff['old']['evidencable_type']
                ?? null;

            return match ($normaliseEvidenceType(is_string($type) ? $type : null)) {
                'participation' => $participationLabelMap->get((int) $value) ?? 'Tournament participation record',
                'achievement' => $achievementLabelMap->get((int) $value) ?? 'Achievement record',
                default => (string) $value,
            };
        };

        $subjectMap = [
            'Member' => 'Member',
            'MemberStatusHistory' => 'Status',
            'NameAlias' => 'Alias',
            'TeamMember' => 'Team membership',
            'Participation' => 'Tournament participation',
            'Achievement' => 'Achievement',
            'MemberSpecialAchievement' => 'Special achievement',
            'MemberPromotion' => 'Promotion',
            'PromotionEvidence' => 'Promotion evidence',
        ];

        $fieldLabelMap = [
            'Member' => [
                'full_name' => 'Name',
                'father_name' => "Father's name",
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
                'posting_district_id' => 'Posting district',
                'joining_date' => 'Joining date',
                'blood_group' => 'Blood group',
                'caste' => 'Caste',
                'initial_rank' => 'Initial rank',
                'promotion_date' => 'Promotion date',
                'team_since' => 'Team since',
                'home_address' => 'Home address',
                'other_notes' => 'Other notes',
                'photo_path' => 'Photo',
            ],
            'MemberStatusHistory' => [
                'status' => 'Status',
                'effective_on' => 'Effective on',
                'reason' => 'Reason',
                'recorded_by' => 'Recorded by',
            ],
            'NameAlias' => [
                'alias' => 'Alias',
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
            'MemberSpecialAchievement' => [
                'achievement_type' => 'Type',
                'title' => 'Title',
                'awarded_on' => 'Awarded on',
                'issuing_authority' => 'Issuing authority',
                'order_reference' => 'Order reference',
                'order_document_path' => 'Order document',
                'order_document_original_name' => 'Order document name',
                'order_document_mime_type' => 'Order document type',
                'order_document_size_bytes' => 'Order document size',
                'place' => 'Place',
                'remarks' => 'Remarks',
            ],
            'MemberPromotion' => [
                'promotion_date' => 'Promotion date',
                'from_rank' => 'From rank',
                'to_rank' => 'To rank',
                'cash_reward_amount' => 'Cash reward amount',
                'cash_reward_date' => 'Cash reward date',
                'cash_reward_reference' => 'Cash reward reference',
                'cash_reward_remarks' => 'Cash reward remarks',
                'reason' => 'Reason',
                'remarks' => 'Remarks',
                'recorded_by' => 'Recorded by',
            ],
            'PromotionEvidence' => [
                'member_promotion_id' => 'Promotion',
                'evidencable_type' => 'Evidence type',
                'evidencable_id' => 'Evidence',
            ],
            'MemberSport' => [
                'member_id' => 'Member',
                'sport_id' => 'Sport',
            ],
        ];

        $hiddenFields = [
            'Member' => ['id', 'organization_id', 'full_name_normalized', 'source_refs', 'deleted_at'],
            'MemberStatusHistory' => ['id', 'member_id'],
            'NameAlias' => ['id', 'member_id', 'alias_normalized'],
            'TeamMember' => ['id', 'member_id'],
            'Participation' => ['id', 'member_id'],
            'Achievement' => ['id'],
            'MemberSpecialAchievement' => ['id', 'organization_id', 'member_id', 'order_document_path'],
            'MemberPromotion' => ['id', 'organization_id', 'member_id', 'recorded_by'],
            'PromotionEvidence' => ['id', 'organization_id', 'member_promotion_id'],
            'MemberSport' => ['id', 'member_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value, array $diff = []) use (
            $sportMap, $unitMap, $districtMap, $userMap,
            $teamMap, $sessionMap, $eventLabelMap, $participationLabelMap,
            $specialAchievementLabelMap,
            $evidenceTypeLabel, $resolveEvidenceLabel,
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $entity === 'Member' && $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'current_unit_id' => $unitMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'home_district_id' => $districtMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'posting_district_id' => $districtMap->get((int) $value) ?? (string) $value,
                $entity === 'MemberSport' && $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $entity === 'Member' && $field === 'photo_path' => '✓',
                $field === 'team_id' => $teamMap->get((int) $value) ?? (string) $value,
                $field === 'session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'recorded_by' => $userMap->get((int) $value) ?? (string) $value,
                $field === 'event_id' => $eventLabelMap->get((int) $value) ?? (string) $value,
                $field === 'participation_id' => $participationLabelMap->get((int) $value) ?? (string) $value,
                $entity === 'MemberSpecialAchievement' && $field === 'order_document_path' => 'Attached',
                $entity === 'MemberSpecialAchievement' && $field === 'order_document_size_bytes' => number_format((int) $value).' bytes',
                $entity === 'MemberSpecialAchievement' && $field === 'id' => $specialAchievementLabelMap->get((int) $value) ?? (string) $value,
                $entity === 'PromotionEvidence' && $field === 'evidencable_type' => $evidenceTypeLabel($value),
                $entity === 'PromotionEvidence' && $field === 'evidencable_id' => $resolveEvidenceLabel($value, $diff),
                is_array($value) || is_object($value) => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '[complex value]',
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
        $teamSessionStatusIds = TeamSessionStatus::where('team_id', $team->id)->pluck('id');

        // Team own events
        $logs = AuditLog::where('entity', 'Team')->where('entity_id', $team->id)->get();

        // TeamMember events
        $logs = $logs->merge(
            AuditLog::where('entity', 'TeamMember')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->team_id', $team->id)
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
                ->where('diff->team_id', $team->id)
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

        $logs = $logs->merge(
            AuditLog::where('entity', 'TeamSessionStatus')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->team_id', $team->id)
                ->get()
        );
        if ($teamSessionStatusIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'TeamSessionStatus')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $teamSessionStatusIds)
                    ->get()
            );
        }

        $allLogs = $logs->unique('id')->sortByDesc('at')->values();

        $sportMap = Sport::pluck('name', 'id');
        $unitMap = Unit::pluck('name', 'id');
        $sessionMap = SportSession::pluck('name', 'id');
        $userMap = User::pluck('name', 'id');
        $memberMap = Member::withoutGlobalScopes()->pluck('full_name', 'id');
        $coachMap = Coach::withoutGlobalScopes()->pluck('full_name', 'id');

        $subjectMap = [
            'Team' => 'Team',
            'TeamMember' => 'Player',
            'CoachAssignment' => 'Coach assignment',
            'TeamSessionStatus' => 'Team session status',
        ];

        $fieldLabelMap = [
            'Team' => [
                'name' => 'Name',
                'sport_id' => 'Sport',
                'session_id' => 'Session',
                'unit_id' => 'Unit',
                'in_charge' => 'In-charge',
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
            'TeamSessionStatus' => [
                'session_id' => 'Session',
                'status' => 'Status',
                'carried_forward_to_session_id' => 'Carried forward to',
                'carried_forward_at' => 'Carried forward at',
                'closed_at' => 'Closed at',
                'closed_reason' => 'Reason',
            ],
        ];

        $hiddenFields = [
            'Team' => ['id', 'organization_id', 'deleted_at'],
            'TeamMember' => ['id', 'team_id'],
            'CoachAssignment' => ['id', 'team_id'],
            'TeamSessionStatus' => ['id', 'team_id', 'organization_id', 'carried_forward_by'],
        ];

        $resolve = function (string $entity, string $field, mixed $value, array $diff = []) use (
            $sportMap, $unitMap, $sessionMap, $memberMap, $coachMap
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $field === 'unit_id' => $unitMap->get((int) $value) ?? (string) $value,
                $field === 'session_id' || $field === 'carried_forward_to_session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'member_id' => $memberMap->get((int) $value) ?? (string) $value,
                $field === 'coach_id' => $coachMap->get((int) $value) ?? (string) $value,
                default => (string) $value,
            };
        };

        return $this->mapLogs($allLogs, $subjectMap, $fieldLabelMap, $hiddenFields, $resolve, $userMap);
    }

    /**
     * Build the audit timeline for an incharge and their team assignments.
     *
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    public function forIncharge(Incharge $incharge): array
    {
        $assignmentIds = TeamInchargeAssignment::where('incharge_id', $incharge->id)->pluck('id');
        $achievementIds = InchargeAchievement::where('incharge_id', $incharge->id)->pluck('id');
        $specialAchievementIds = InchargeSpecialAchievement::where('incharge_id', $incharge->id)->pluck('id');

        $logs = AuditLog::where('entity', 'Incharge')->where('entity_id', $incharge->id)->get();

        $logs = $logs->merge(
            AuditLog::where('entity', 'TeamInchargeAssignment')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->incharge_id', $incharge->id)
                ->get()
        );
        $logs = $logs->merge(
            AuditLog::where('entity', 'InchargeAchievement')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->incharge_id', $incharge->id)
                ->get()
        );
        $logs = $logs->merge(
            AuditLog::where('entity', 'InchargeSpecialAchievement')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->incharge_id', $incharge->id)
                ->get()
        );

        if ($assignmentIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'TeamInchargeAssignment')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $assignmentIds)
                    ->get()
            );
        }
        if ($achievementIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'InchargeAchievement')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $achievementIds)
                    ->get()
            );
        }
        if ($specialAchievementIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'InchargeSpecialAchievement')
                    ->where('action', 'updated')
                    ->whereIn('entity_id', $specialAchievementIds)
                    ->get()
            );
        }

        $allLogs = $logs->unique('id')->sortByDesc('at')->values();

        $teamMap = Team::withoutGlobalScopes()->pluck('name', 'id');
        $userMap = User::pluck('name', 'id');

        $subjectMap = [
            'Incharge' => 'Incharge',
            'TeamInchargeAssignment' => 'Team assignment',
            'InchargeAchievement' => 'Achievement',
            'InchargeSpecialAchievement' => 'Special achievement',
        ];

        $fieldLabelMap = [
            'Incharge' => [
                'full_name' => 'Name',
                'pno' => 'PNO',
                'rank' => 'Rank',
                'designation' => 'Designation',
                'mobile' => 'Mobile',
                'email' => 'Email',
                'is_active' => 'Active',
                'remarks' => 'Remarks',
            ],
            'TeamInchargeAssignment' => [
                'team_id' => 'Team',
                'incharge_id' => 'Incharge',
                'assigned_at' => 'Assigned on',
                'removed_at' => 'Removed on',
                'assignment_reason' => 'Assignment reason',
                'removal_reason' => 'Removal reason',
                'is_current' => 'Current',
            ],
            'InchargeAchievement' => [
                'title' => 'Title',
                'description' => 'Description',
                'achieved_on' => 'Achieved on',
                'remarks' => 'Remarks',
            ],
            'InchargeSpecialAchievement' => [
                'achievement_type' => 'Type',
                'title' => 'Title',
                'awarded_on' => 'Awarded on',
                'issuing_authority' => 'Issuing authority',
                'order_reference' => 'Order reference',
                'place' => 'Place',
                'remarks' => 'Remarks',
            ],
        ];

        $hiddenFields = [
            'Incharge' => ['id', 'organization_id', 'deleted_at'],
            'TeamInchargeAssignment' => ['id', 'current_team_id'],
            'InchargeAchievement' => ['id', 'organization_id', 'incharge_id'],
            'InchargeSpecialAchievement' => ['id', 'organization_id', 'incharge_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value) use ($teamMap, $incharge): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $field === 'team_id' => $teamMap->get((int) $value) ?? (string) $value,
                $field === 'incharge_id' => (int) $value === $incharge->id ? $incharge->full_name : (string) $value,
                is_bool($value) => $value ? 'Yes' : 'No',
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
        $coachAliasIds = CoachAlias::where('coach_id', $coach->id)->pluck('id');
        $coachCertificationIds = CoachCertification::where('coach_id', $coach->id)->pluck('id');
        $coachPromotionIds = CoachPromotion::where('coach_id', $coach->id)->pluck('id');
        $coachPromotionEvidenceIds = CoachPromotionEvidence::whereIn('coach_promotion_id', $coachPromotionIds)->pluck('id');
        $coachSportIds = CoachSport::where('coach_id', $coach->id)->pluck('id');
        $coachStatusHistoryIds = CoachStatusHistory::where('coach_id', $coach->id)->pluck('id');
        $coachSpecialAchievementIds = CoachSpecialAchievement::where('coach_id', $coach->id)->pluck('id');
        $coachPlayingAchievementIds = CoachPlayingAchievement::where('coach_id', $coach->id)->pluck('id');

        $logs = AuditLog::where('entity', 'Coach')->where('entity_id', $coach->id)->get();

        foreach ([
            ['entity' => 'CoachAlias', 'ids' => $coachAliasIds],
            ['entity' => 'CoachCertification', 'ids' => $coachCertificationIds],
            ['entity' => 'CoachPromotion', 'ids' => $coachPromotionIds],
            ['entity' => 'CoachPromotionEvidence', 'ids' => $coachPromotionEvidenceIds],
            ['entity' => 'CoachSport', 'ids' => $coachSportIds],
            ['entity' => 'CoachStatusHistory', 'ids' => $coachStatusHistoryIds],
            ['entity' => 'CoachSpecialAchievement', 'ids' => $coachSpecialAchievementIds],
            ['entity' => 'CoachPlayingAchievement', 'ids' => $coachPlayingAchievementIds],
        ] as ['entity' => $entity, 'ids' => $ids]) {
            $logs = $logs->merge(
                AuditLog::where('entity', $entity)
                    ->whereIn('action', ['created', 'deleted'])
                    ->where('diff->coach_id', $coach->id)
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

        if ($coachPromotionIds->isNotEmpty()) {
            $logs = $logs->merge(
                AuditLog::where('entity', 'CoachPromotionEvidence')
                    ->whereIn('action', ['created', 'deleted'])
                    ->whereIn('diff->coach_promotion_id', $coachPromotionIds)
                    ->get()
            );
        }

        $logs = $logs->merge(
            AuditLog::where('entity', 'CoachAssignment')
                ->whereIn('action', ['created', 'deleted'])
                ->where('diff->coach_id', $coach->id)
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
        $teamMap = Team::pluck('name', 'id');
        $tournamentMap = Tournament::pluck('name', 'id');
        $eventMap = Event::pluck('name', 'id');
        $memberMap = Member::withoutGlobalScopes()->pluck('full_name', 'id');
        $sportMap = Sport::pluck('name', 'id');
        $coachSpecialAchievementLabelMap = $coachSpecialAchievementIds->isNotEmpty()
            ? CoachSpecialAchievement::whereIn('id', $coachSpecialAchievementIds)
                ->get()
                ->mapWithKeys(fn (CoachSpecialAchievement $achievement) => [
                    $achievement->id => collect([
                        $achievement->achievement_type,
                        $achievement->title,
                        $achievement->order_reference,
                    ])->filter()->join(' · '),
                ])
            : collect();
        $coachPlayingAchievementLabelMap = $coachPlayingAchievementIds->isNotEmpty()
            ? CoachPlayingAchievement::whereIn('id', $coachPlayingAchievementIds)
                ->get()
                ->mapWithKeys(fn (CoachPlayingAchievement $achievement) => [
                    $achievement->id => collect([
                        $achievement->level,
                        $achievement->title,
                    ])->filter()->join(' · '),
                ])
            : collect();

        $subjectMap = [
            'Coach' => 'Coach',
            'CoachAlias' => 'Alias',
            'CoachCertification' => 'Certification',
            'CoachPromotion' => 'Promotion',
            'CoachPromotionEvidence' => 'Reward event',
            'CoachSport' => 'Sport specialization',
            'CoachStatusHistory' => 'Status',
            'CoachSpecialAchievement' => 'Special achievement',
            'CoachPlayingAchievement' => 'Playing career achievement',
            'CoachAssignment' => 'Team assignment',
        ];

        $fieldLabelMap = [
            'Coach' => [
                'full_name' => 'Name',
                'pno' => 'PNO',
                'mobile' => 'Mobile',
                'member_id' => 'Linked member',
                'coach_status' => 'Status',
                'photo_path' => 'Photo',
            ],
            'CoachAlias' => [
                'alias' => 'Alias',
                'source' => 'Source',
            ],
            'CoachCertification' => [
                'name' => 'Name',
                'certificate_type' => 'Type',
                'issuer' => 'Issuer',
                'issued_at' => 'Issued',
                'expired_at' => 'Expired',
                'attachment_path' => 'Attachment',
            ],
            'CoachPromotion' => [
                'promotion_date' => 'Promotion date',
                'from_rank' => 'From rank',
                'to_rank' => 'To rank',
                'cash_reward_amount' => 'Cash reward amount',
                'cash_reward_date' => 'Cash reward date',
                'cash_reward_reference' => 'Cash reward reference',
                'cash_reward_remarks' => 'Cash reward remarks',
                'reason' => 'Reason',
                'remarks' => 'Remarks',
                'recorded_by' => 'Recorded by',
            ],
            'CoachPromotionEvidence' => [
                'session_id' => 'Session',
                'tournament_id' => 'Tournament',
                'event_id' => 'Event',
                'team_id' => 'Team',
            ],
            'CoachSport' => [
                'sport_id' => 'Sport',
                'is_primary' => 'Primary',
                'level_master_id' => 'Tier / level',
                'level' => 'Level',
                'sport_event' => 'Sport event',
                'effective_from' => 'From',
                'effective_to' => 'To',
                'notes' => 'Notes',
            ],
            'CoachStatusHistory' => [
                'status' => 'Status',
                'effective_on' => 'Effective on',
                'reason' => 'Reason',
                'recorded_by' => 'Recorded by',
            ],
            'CoachSpecialAchievement' => [
                'achievement_type' => 'Type',
                'title' => 'Title',
                'awarded_on' => 'Awarded on',
                'issuing_authority' => 'Issuing authority',
                'order_reference' => 'Order reference',
                'order_document_path' => 'Order document',
                'order_document_original_name' => 'Order document name',
                'order_document_mime_type' => 'Order document type',
                'order_document_size_bytes' => 'Order document size',
                'place' => 'Place',
                'remarks' => 'Remarks',
            ],
            'CoachPlayingAchievement' => [
                'title' => 'Title',
                'period' => 'Period',
                'level' => 'Level',
                'competition_details' => 'Competition details',
                'event_date' => 'Event date',
                'venue' => 'Venue',
                'sport_id' => 'Sport',
                'event' => 'Event',
                'discipline' => 'Discipline',
                'weight_category' => 'Weight category',
                'gender_class' => 'Class',
                'medal_type' => 'Medal',
                'position' => 'Position',
                'description' => 'Description',
                'achieved_on' => 'Achieved on',
                'remarks' => 'Remarks',
            ],
            'CoachAssignment' => [
                'team_id' => 'Team',
                'session_id' => 'Session',
                'role' => 'Role',
            ],
        ];

        $hiddenFields = [
            'Coach' => ['id', 'organization_id', 'deleted_at'],
            'CoachAlias' => ['id', 'coach_id', 'alias_normalized'],
            'CoachCertification' => ['id', 'coach_id', 'metadata', 'deleted_at'],
            'CoachPromotion' => ['id', 'organization_id', 'coach_id', 'recorded_by'],
            'CoachPromotionEvidence' => ['id', 'organization_id', 'coach_promotion_id', 'achievement_id'],
            'CoachSport' => ['id', 'coach_id'],
            'CoachStatusHistory' => ['id', 'coach_id'],
            'CoachSpecialAchievement' => ['id', 'organization_id', 'coach_id', 'order_document_path'],
            'CoachPlayingAchievement' => ['id', 'organization_id', 'coach_id'],
            'CoachAssignment' => ['id', 'coach_id'],
        ];

        $resolve = function (string $entity, string $field, mixed $value, array $diff = []) use (
            $sessionMap, $sportMap, $teamMap, $tournamentMap, $eventMap, $memberMap, $userMap,
            $coachSpecialAchievementLabelMap, $coachPlayingAchievementLabelMap,
        ): ?string {
            if ($value === null) {
                return null;
            }

            return match (true) {
                $field === 'session_id' => $sessionMap->get((int) $value) ?? (string) $value,
                $field === 'sport_id' => $sportMap->get((int) $value) ?? (string) $value,
                $field === 'team_id' => $teamMap->get((int) $value) ?? (string) $value,
                $field === 'tournament_id' => $tournamentMap->get((int) $value) ?? (string) $value,
                $field === 'event_id' => $eventMap->get((int) $value) ?? (string) $value,
                $field === 'member_id' => $memberMap->get((int) $value) ?? (string) $value,
                $field === 'recorded_by' => $userMap->get((int) $value) ?? (string) $value,
                $entity === 'CoachSpecialAchievement' && $field === 'order_document_path' => 'Attached',
                $entity === 'CoachSpecialAchievement' && $field === 'order_document_size_bytes' => number_format((int) $value).' bytes',
                $entity === 'CoachSpecialAchievement' && $field === 'id' => $coachSpecialAchievementLabelMap->get((int) $value) ?? (string) $value,
                $entity === 'CoachPlayingAchievement' && $field === 'id' => $coachPlayingAchievementLabelMap->get((int) $value) ?? (string) $value,
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
     * @param  callable(string, string, mixed, array<string, mixed>): ?string  $resolve
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
                        'old' => $resolve($entity, $field, $oldVal, $diff),
                        'new' => $resolve($entity, $field, $newVal, $diff),
                    ];
                }
            } else {
                $isDeleted = $log->action === 'deleted';
                foreach ($diff as $field => $value) {
                    if (in_array($field, $hidden, true) || $value === null || $value === '') {
                        continue;
                    }
                    $resolved = $resolve($entity, $field, $value, $diff);
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
