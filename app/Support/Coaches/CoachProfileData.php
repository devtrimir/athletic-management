<?php

declare(strict_types=1);

namespace App\Support\Coaches;

use App\Http\Resources\CoachAliasResource;
use App\Http\Resources\CoachResource;
use App\Http\Resources\CoachStatusHistoryResource;
use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\CoachPlayingAchievement;
use App\Models\CoachPromotionEvidence;
use App\Models\CoachSpecialAchievement;
use App\Models\Member;
use App\Models\Rank;
use App\Models\Scopes\BelongsToOrganization;
use App\Models\Sport;
use App\Models\TeamMember;
use App\Models\TournamentTier;
use App\Services\AuditLogBuilder;
use Illuminate\Support\Collection;

class CoachProfileData
{
    public function __construct(
        private readonly AuditLogBuilder $auditLogBuilder,
    ) {}

    /** @return array<string, mixed> */
    public function overview(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'overview',
        ];
    }

    /** @return array<string, mixed> */
    public function assignments(Coach $coach): array
    {
        $coach->loadMissing([
            'assignmentHistory' => fn ($query) => $query
                ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
                ->orderByDesc('is_current')
                ->orderByDesc('assigned_at')
                ->orderByDesc('id'),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'assignments',
            'coachTeams' => $this->assignmentsPayload($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function sports(Coach $coach): array
    {
        $coach->loadMissing([
            'sports' => fn ($query) => $query->withPivot(['id', 'is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes']),
        ]);

        $activeCoachAssignments = CoachAssignment::query()
            ->where('coach_id', $coach->id)
            ->where('is_current', true)
            ->whereNull('removed_at')
            ->whereHas('team', fn ($query) => $query->where('is_active', true)->whereNull('deleted_at'))
            ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
            ->get();

        $activeTeamSports = $activeCoachAssignments->map(fn (CoachAssignment $ca): array => [
            'team_id' => (int) $ca->team_id,
            'team_name' => $ca->team?->name ?? '',
            'sport_id' => (int) $ca->team?->sport_id,
            'sport_name' => $ca->team?->sport?->name ?? '',
            'session_name' => $ca->session?->name ?? '',
            'role' => $ca->role,
        ])->values()->all();

        return [
            ...$this->shell($coach),
            'activeTab' => 'sports',
            'active_team_sports' => $activeTeamSports,
            'sports' => Sport::query()
                ->select(['id', 'name', 'category'])
                ->where('organization_id', $coach->organization_id)
                ->orderBy('name')
                ->get(),
            'tiers' => TournamentTier::query()
                ->select(['id', 'code', 'label_hi', 'label_en', 'weight'])
                ->orderByDesc('weight')
                ->get(),
        ];
    }

    /** @return array<string, mixed> */
    public function certifications(Coach $coach): array
    {
        $coach->loadMissing('certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,attachment_original_name,mime_type,size_bytes,metadata');

        return [
            ...$this->shell($coach),
            'activeTab' => 'certifications',
        ];
    }

    /** @return array<string, mixed> */
    public function achievements(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'achievements',
            'coachAchievements' => $this->achievementsPayload($coach),
            'playingAchievements' => $this->playingAchievementsPayload($coach),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
        ];
    }

    /** @return array<string, mixed> */
    public function specialAchievements(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'special-achievements',
            'specialAchievements' => $this->specialAchievementsPayload($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function promotions(Coach $coach): array
    {
        $coach->loadMissing([
            // Records synced in from a linked member's own promotions/rewards are kept for rank
            // consistency but hidden here to avoid showing the same event twice on both profiles.
            'promotions' => fn ($query) => $query
                ->where('source', 'native')
                ->with([
                    'recorder:id,name',
                    'evidences.session:id,name',
                    'evidences.tournament:id,name,tier_id,date_from,date_to,venue',
                    'evidences.tournament.tier:id,code,label_en,label_hi',
                    'evidences.event:id,tournament_id,name,gender_class,discipline,weight_category,event_type',
                    'evidences.team:id,name',
                    'evidences.achievement:id,medal_type,position',
                ])
                ->orderByDesc('promotion_date')
                ->orderByDesc('id'),
        ]);

        $achievementsPayload = $this->achievementsPayload($coach);

        return [
            ...$this->attachEvidenceMedalCounts($this->shell($coach), $achievementsPayload['groups']),
            'activeTab' => 'promotions',
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'rewardEvidenceOptions' => $this->rewardEvidenceOptionsPayload($coach, $achievementsPayload['groups']),
        ];
    }

    /** @return array<string, mixed> */
    public function media(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'media',
        ];
    }

    /** @return array<string, mixed> */
    public function aliases(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'aliases',
            'aliases' => CoachAliasResource::collection($coach->aliases()->get())->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'changelog',
            'auditLog' => $this->auditLogBuilder->forCoach($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function status(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'status',
            'statusHistory' => CoachStatusHistoryResource::collection(
                $coach->statusHistory()->with('recorder')->get()
            )->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    public function print(Coach $coach): array
    {
        $coach->loadMissing([
            'assignmentHistory' => fn ($query) => $query
                ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
                ->orderByDesc('is_current')
                ->orderByDesc('assigned_at')
                ->orderByDesc('id'),
            'sports' => fn ($query) => $query->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes']),
            'certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,attachment_original_name,mime_type,size_bytes,metadata',
            // Records synced in from a linked member's own promotions/rewards are kept for rank
            // consistency but hidden here to avoid showing the same event twice on both profiles.
            'promotions' => fn ($query) => $query
                ->where('source', 'native')
                ->with([
                    'recorder:id,name',
                    'evidences.session:id,name',
                    'evidences.tournament:id,name,tier_id,date_from,date_to,venue',
                    'evidences.tournament.tier:id,code,label_en,label_hi',
                    'evidences.event:id,tournament_id,name,gender_class,discipline,weight_category,event_type',
                    'evidences.team:id,name',
                    'evidences.achievement:id,medal_type,position',
                ])
                ->orderByDesc('promotion_date')
                ->orderByDesc('id'),
            'statusHistory' => fn ($query) => $query->with('recorder')->orderByDesc('effective_on')->orderByDesc('id'),
        ]);

        $achievementsPayload = $this->achievementsPayload($coach);

        return [
            ...$this->attachEvidenceMedalCounts($this->shell($coach), $achievementsPayload['groups']),
            'coachTeams' => $this->assignmentsPayload($coach),
            'statusHistory' => CoachStatusHistoryResource::collection($coach->statusHistory)->resolve(),
            'coachAchievements' => $achievementsPayload,
            'specialAchievements' => $this->specialAchievementsPayload($coach),
            'playingAchievements' => $this->playingAchievementsPayload($coach),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Coach $coach): array
    {
        $coach->loadMissing([
            'district:id,name',
            'unit:id,name,district_id',
            'nisMaster:id,kind,code,name,short_name',
            'tierMaster:id,code,label_hi,label_en,weight',
            'rankMaster:id,code,name,short_name',
            'member:id,member_code,full_name,pno,current_status',
        ]);

        $coachData = (new CoachResource($coach))->resolve();
        $coachData['team_activity_status'] = $coach->hasActiveCurrentSessionTeamAssignment() ? 'active' : 'inactive';

        return [
            'coach' => $coachData,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function assignmentsPayload(Coach $coach): array
    {
        return $coach->assignmentHistory
            ->map(fn (CoachAssignment $coachAssignment): array => [
                'id' => $coachAssignment->id,
                'role' => $coachAssignment->role,
                'is_current' => (bool) $coachAssignment->is_current,
                'assigned_at' => $coachAssignment->assigned_at?->toDateTimeString(),
                'removed_at' => $coachAssignment->removed_at?->toDateTimeString(),
                'notes' => $coachAssignment->notes,
                'team' => $coachAssignment->team ? ['id' => $coachAssignment->team->id, 'name' => $coachAssignment->team->name] : null,
                'sport' => $coachAssignment->team?->sport ? ['id' => $coachAssignment->team->sport->id, 'name' => $coachAssignment->team->sport->name] : null,
                'session' => $coachAssignment->session ? ['id' => $coachAssignment->session->id, 'name' => $coachAssignment->session->name] : null,
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function achievementsPayload(Coach $coach): array
    {
        $assignments = CoachAssignment::query()
            ->where('coach_id', $coach->id)
            ->with('team:id,organization_id,name')
            ->get()
            ->filter(fn (CoachAssignment $assignment): bool => $assignment->team?->organization_id === $coach->organization_id)
            ->values();

        if ($assignments->isEmpty()) {
            return $this->emptyAchievementsPayload();
        }

        $assignmentPairs = $assignments
            ->map(fn (CoachAssignment $assignment): string => $this->teamSessionKey($assignment->team_id, $assignment->session_id))
            ->unique()
            ->values();

        $teamIds = $assignments->pluck('team_id')->unique()->values();
        $sessionIds = $assignments->pluck('session_id')->unique()->values();

        $membershipKeys = TeamMember::query()
            ->whereIn('team_id', $teamIds)
            ->whereIn('session_id', $sessionIds)
            ->get(['team_id', 'member_id', 'session_id'])
            ->map(fn (TeamMember $teamMember): string => $this->memberTeamSessionKey(
                $teamMember->member_id,
                $teamMember->team_id,
                $teamMember->session_id,
            ))
            ->flip();

        if ($coach->member_id !== null) {
            foreach ($assignments as $assignment) {
                $membershipKeys->put(
                    $this->memberTeamSessionKey($coach->member_id, $assignment->team_id, $assignment->session_id),
                    true,
                );
            }
        }

        $assignmentsByPair = $assignments->groupBy(
            fn (CoachAssignment $assignment): string => $this->teamSessionKey($assignment->team_id, $assignment->session_id)
        );

        $achievements = Achievement::query()
            ->whereHas('participation', function ($query) use ($assignmentPairs, $coach): void {
                $query
                    ->whereHas('team', fn ($teamQuery) => $teamQuery->where('organization_id', $coach->organization_id))
                    ->where(function ($pairQuery) use ($assignmentPairs): void {
                        foreach ($assignmentPairs as $pair) {
                            [$teamId, $sessionId] = explode(':', $pair);

                            $pairQuery->orWhere(function ($query) use ($teamId, $sessionId): void {
                                $query
                                    ->where('team_id', (int) $teamId)
                                    ->where('session_id', (int) $sessionId);
                            });
                        }
                    });
            })
            ->with([
                'participation.member:id,full_name,pno',
                'participation.member.coach:id,member_id',
                'participation.session:id,name,is_current',
                'participation.team:id,name',
                'participation.event:id,tournament_id,sport_id,name,gender_class,discipline,weight_category,event_type',
                'participation.event.sport:id,name',
                'participation.event.tournament:id,name,tier_id,date_from,date_to,venue,session_id,sport_id',
                'participation.event.tournament.sport:id,name',
                'participation.event.tournament.tier:id,code,weight,label_en,label_hi',
                'benefits',
            ])
            ->orderByDesc('id')
            ->get()
            ->filter(function (Achievement $achievement) use ($assignmentsByPair, $membershipKeys): bool {
                $participation = $achievement->participation;

                if ($participation->team_id === null) {
                    return false;
                }

                if ($participation->member_id !== null
                    && ! $membershipKeys->has($this->memberTeamSessionKey($participation->member_id, $participation->team_id, $participation->session_id))) {
                    return false;
                }

                $assignments = $assignmentsByPair->get($this->teamSessionKey($participation->team_id, $participation->session_id), collect());

                return $assignments->contains(fn (CoachAssignment $assignment): bool => $this->achievementFallsWithinAssignment($achievement, $assignment));
            })
            ->values();

        if ($achievements->isEmpty()) {
            return $this->emptyAchievementsPayload();
        }

        $rewardEvidenceByKey = CoachPromotionEvidence::query()
            ->with('coachPromotion:id,to_rank,promotion_date,cash_reward_amount,cash_reward_date,cash_reward_reference')
            ->whereHas('coachPromotion', fn ($query) => $query->where('coach_id', $coach->id)->where('source', 'native'))
            ->get(['id', 'coach_promotion_id', 'session_id', 'tournament_id', 'event_id', 'team_id'])
            ->groupBy(fn (CoachPromotionEvidence $evidence): string => $evidence->event_id === null
                ? $this->rewardTournamentEvidenceKey($evidence->session_id, $evidence->tournament_id, (int) $evidence->team_id)
                : $this->rewardEvidenceKey($evidence->session_id, $evidence->tournament_id, (int) $evidence->event_id, (int) $evidence->team_id));

        $summary = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        $countableAchievements = $achievements->filter(
            fn (Achievement $achievement): bool => $this->countsForCoachMedalSummary($achievement)
        );

        $uniqueTeamMedals = $countableAchievements->unique(function (Achievement $achievement): string {
            $participation = $achievement->participation;
            if ($participation->event?->event_type === 'team') {
                return $participation->event_id.':'.$participation->team_id.':'.$participation->session_id.':'.$achievement->medal_type;
            }

            return (string) $achievement->id;
        });

        foreach ($uniqueTeamMedals as $achievement) {
            if (array_key_exists($achievement->medal_type, $summary)) {
                $summary[$achievement->medal_type]++;
            }
        }

        $seenRewardIds = collect();

        $groups = $achievements
            ->groupBy(fn (Achievement $achievement): string => collect([
                $achievement->participation->session_id,
                $achievement->participation->event->tournament->tier?->code ?? 'OTHER',
                $achievement->participation->event->tournament->id,
                $achievement->participation->event->id,
                $achievement->participation->team_id,
            ])->join(':'))
            ->map(function (Collection $group) use ($rewardEvidenceByKey, $seenRewardIds): array {
                $payload = $this->coachAchievementGroupPayload($group, $rewardEvidenceByKey);
                // A single reward can cite several achievements as evidence; attribute its
                // cash amount to only the first group encountered so it is never double-counted.
                $payload['rewards'] = collect($payload['rewards'])
                    ->reject(function (array $reward) use ($seenRewardIds): bool {
                        if ($seenRewardIds->has($reward['coach_promotion_id'])) {
                            return true;
                        }

                        $seenRewardIds->put($reward['coach_promotion_id'], true);

                        return false;
                    })
                    ->values()
                    ->all();

                return $payload;
            })
            ->sortBy([
                ['session.name', 'desc'],
                ['tournament.tier_weight', 'desc'],
                ['tournament.date_from', 'desc'],
                ['tournament.name', 'asc'],
                ['event.name', 'asc'],
            ])
            ->values()
            ->all();

        return [
            'summary' => [
                ...$summary,
                'total_events' => $countableAchievements
                    ->map(fn (Achievement $achievement): string => $achievement->participation->event_id.':'.$achievement->participation->team_id.':'.$achievement->participation->session_id)
                    ->unique()
                    ->count(),
                'medal_winning_players' => $countableAchievements
                    ->map(fn (Achievement $achievement): ?int => $achievement->participation->member_id)
                    ->filter()
                    ->unique()
                    ->count(),
            ],
            'groups' => $groups,
        ];
    }

    /** @return array<string, mixed> */
    private function specialAchievementsPayload(Coach $coach): array
    {
        $records = $coach->specialAchievements()
            ->get()
            ->map(fn (CoachSpecialAchievement $achievement): array => [
                'id' => $achievement->id,
                'achievement_type' => $achievement->achievement_type,
                'title' => $achievement->title,
                'awarded_on' => $achievement->awarded_on?->toDateString(),
                'issuing_authority' => $achievement->issuing_authority,
                'order_reference' => $achievement->order_reference,
                'order_document' => $achievement->order_document_path ? [
                    'path' => $achievement->order_document_path,
                    'url' => route('coaches.special-achievements.order-document.preview', [$coach, $achievement]),
                    'preview_url' => route('coaches.special-achievements.order-document.preview', [$coach, $achievement]),
                    'download_url' => route('coaches.special-achievements.order-document', [$coach, $achievement]),
                    'original_name' => $achievement->order_document_original_name,
                    'mime_type' => $achievement->order_document_mime_type,
                    'size_bytes' => $achievement->order_document_size_bytes,
                ] : null,
                'place' => $achievement->place,
                'remarks' => $achievement->remarks,
            ])
            ->values()
            ->all();

        return [
            'records' => $records,
            'summary' => [
                'total' => count($records),
                'commendation_discs' => collect($records)
                    ->where('achievement_type', 'COMMENDATION_DISC')
                    ->count(),
            ],
        ];
    }

    /**
     * Playing-career achievements from when the coach was a player. When the
     * coach is linked to a member record the section is read-only and derived
     * from that member's real tournament achievements; otherwise it falls
     * back to the standalone free-form (legacy) records.
     *
     * @return array<string, mixed>
     */
    private function playingAchievementsPayload(Coach $coach): array
    {
        $sports = Sport::query()
            ->select(['id', 'name', 'category'])
            ->where('organization_id', $coach->organization_id)
            ->orderBy('name')
            ->get();

        $member = $coach->member;
        if ($member === null && $coach->member_id !== null) {
            $member = Member::withoutGlobalScope(BelongsToOrganization::class)->find($coach->member_id);
        }

        if ($member !== null) {
            return $this->memberPlayingAchievementsPayload($coach, $member, $sports);
        }

        $records = $coach->playingAchievements()
            ->with('sport:id,name')
            ->get()
            ->map(fn (CoachPlayingAchievement $achievement): array => [
                'id' => $achievement->id,
                'title' => $achievement->title,
                'period' => $achievement->period,
                'level' => $achievement->level,
                'competition_details' => $achievement->competition_details,
                'event_date' => $achievement->event_date?->toDateString(),
                'venue' => $achievement->venue,
                'sport_id' => $achievement->sport_id,
                'sport' => $achievement->sport ? [
                    'id' => $achievement->sport->id,
                    'name' => $achievement->sport->name,
                ] : null,
                'event' => $achievement->event,
                'discipline' => $achievement->discipline,
                'weight_category' => $achievement->weight_category,
                'gender_class' => $achievement->gender_class,
                'medal_type' => $achievement->medal_type,
                'event_type' => $achievement->event_type,
                'source_achievement_id' => $achievement->source_achievement_id,
                'position' => $achievement->position,
                'description' => $achievement->description,
                'achieved_on' => $achievement->achieved_on?->toDateString(),
                'remarks' => $achievement->remarks,
            ])
            ->values()
            ->all();

        return [
            'source' => 'legacy',
            'linked_member' => null,
            'records' => $records,
            'pre_recruitment_records' => [],
            'sports' => $sports,
            'summary' => [
                'total' => count($records),
                'medals' => collect($records)
                    ->whereIn('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT'])
                    ->count(),
                'tournament_medals' => 0,
                'pre_recruitment_medals' => collect($records)
                    ->whereIn('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT'])
                    ->count(),
            ],
        ];
    }

    /**
     * @param  Collection<int, Sport>  $sports
     * @return array<string, mixed>
     */
    private function memberPlayingAchievementsPayload(Coach $coach, Member $member, Collection $sports): array
    {
        $achievements = Achievement::forMember($member)
            ->with([
                'participation.session:id,name',
                'participation.event:id,tournament_id,name,event_type',
                'participation.event.tournament:id,name,tier_id,date_from,date_to,venue',
                'participation.event.tournament.tier:id,code,label_en,label_hi,weight',
            ])
            ->orderByDesc('id')
            ->get();

        $records = $achievements
            ->map(function (Achievement $achievement): array {
                $participation = $achievement->participation;
                $event = $participation->event;
                $tournament = $event->tournament;
                $eventKind = $event->event_type ?? ($participation->team_id ? 'team' : 'individual');

                return [
                    'id' => $achievement->id,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'remarks' => $achievement->remarks,
                    'session' => $participation->session ? [
                        'id' => $participation->session->id,
                        'name' => $participation->session->name,
                    ] : null,
                    'tournament' => $tournament ? [
                        'id' => $tournament->id,
                        'name' => $tournament->name,
                        'tier_code' => $tournament->tier?->code,
                        'tier_label' => $tournament->tier?->label,
                        'tier_label_en' => $tournament->tier?->label_en,
                        'tier_label_hi' => $tournament->tier?->label_hi,
                        'date_from' => $tournament->date_from?->toDateString(),
                        'date_to' => $tournament->date_to?->toDateString(),
                        'venue' => $tournament->venue,
                    ] : null,
                    'event' => $event ? [
                        'id' => $event->id,
                        'name' => $event->name,
                    ] : null,
                    'event_kind' => $eventKind === 'team' ? 'team' : 'individual',
                    'achieved_on' => $tournament?->date_from?->toDateString(),
                ];
            })
            ->values()
            ->all();

        $preRecruitmentRecords = $coach->playingAchievements()
            ->with('sport:id,name')
            ->get()
            ->map(fn (CoachPlayingAchievement $achievement): array => [
                'id' => $achievement->id,
                'title' => $achievement->title,
                'period' => $achievement->period,
                'level' => $achievement->level,
                'competition_details' => $achievement->competition_details,
                'event_date' => $achievement->event_date?->toDateString(),
                'venue' => $achievement->venue,
                'sport_id' => $achievement->sport_id,
                'sport' => $achievement->sport ? [
                    'id' => $achievement->sport->id,
                    'name' => $achievement->sport->name,
                ] : null,
                'event' => $achievement->event,
                'discipline' => $achievement->discipline,
                'weight_category' => $achievement->weight_category,
                'gender_class' => $achievement->gender_class,
                'medal_type' => $achievement->medal_type,
                'event_type' => $achievement->event_type,
                'source_achievement_id' => $achievement->source_achievement_id,
                'position' => $achievement->position,
                'description' => $achievement->description,
                'achieved_on' => $achievement->achieved_on?->toDateString(),
                'remarks' => $achievement->remarks,
            ])
            ->values()
            ->all();

        $tournamentMedalsCount = $achievements
            ->whereIn('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT'])
            ->count();

        $preRecruitmentMedalsCount = collect($preRecruitmentRecords)
            ->whereIn('medal_type', ['GOLD', 'SILVER', 'BRONZE', 'MERIT'])
            ->count();

        return [
            'source' => 'member',
            'linked_member' => [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
            ],
            'records' => $records,
            'pre_recruitment_records' => $preRecruitmentRecords,
            'sports' => $sports,
            'summary' => [
                'total' => count($records) + count($preRecruitmentRecords),
                'medals' => $tournamentMedalsCount + $preRecruitmentMedalsCount,
                'tournament_medals' => $tournamentMedalsCount,
                'pre_recruitment_medals' => $preRecruitmentMedalsCount,
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $achievementGroups
     * @return array<int, array<string, mixed>>
     */
    private function rewardEvidenceOptionsPayload(Coach $coach, array $achievementGroups): array
    {
        $achievementGroups = collect($achievementGroups);

        if ($achievementGroups->isEmpty()) {
            return [];
        }

        $usedInPromotions = CoachPromotionEvidence::query()
            ->whereHas('coachPromotion', fn ($query) => $query->where('coach_id', $coach->id)->where('source', 'native')->whereNotNull('to_rank'))
            ->get(['id', 'coach_promotion_id', 'session_id', 'tournament_id', 'event_id', 'team_id']);

        $usedInRewards = CoachPromotionEvidence::query()
            ->whereHas('coachPromotion', fn ($query) => $query->where('coach_id', $coach->id)->where('source', 'native')->whereNotNull('cash_reward_amount'))
            ->get(['id', 'coach_promotion_id', 'session_id', 'tournament_id', 'event_id', 'team_id']);

        return $achievementGroups
            ->groupBy(fn (array $group): int => (int) $group['session']['id'])
            ->map(function (Collection $sessionGroups) use ($usedInPromotions, $usedInRewards): array {
                $first = $sessionGroups->first();

                return [
                    'session' => $first['session'],
                    'tournaments' => $sessionGroups
                        ->groupBy(fn (array $group): string => $group['tournament']['id'].':'.$group['team']['id'])
                        ->map(function (Collection $tournamentGroups) use ($usedInPromotions, $usedInRewards): array {
                            $first = $tournamentGroups->first();
                            $sessionId = (int) $first['session']['id'];
                            $tournamentId = (int) $first['tournament']['id'];
                            $teamId = (int) $first['team']['id'];

                            $events = $tournamentGroups->map(function (array $group) use ($usedInPromotions, $usedInRewards, $sessionId, $tournamentId): array {
                                $eventId = (int) $group['event']['id'];
                                $groupTeamId = (int) $group['team']['id'];

                                $usedInPromotion = $usedInPromotions->first(fn (CoachPromotionEvidence $e): bool => (int) $e->session_id === $sessionId &&
                                    (int) $e->tournament_id === $tournamentId &&
                                    ($e->event_id === null || (int) $e->event_id === $eventId) &&
                                    ($e->team_id === null || (int) $e->team_id === $groupTeamId)
                                );

                                $usedInReward = $usedInRewards->first(fn (CoachPromotionEvidence $e): bool => (int) $e->session_id === $sessionId &&
                                    (int) $e->tournament_id === $tournamentId &&
                                    ($e->event_id === null || (int) $e->event_id === $eventId) &&
                                    ($e->team_id === null || (int) $e->team_id === $groupTeamId)
                                );

                                return [
                                    'id' => $sessionId.':'.$tournamentId.':'.$eventId.':'.$groupTeamId,
                                    'session_id' => $sessionId,
                                    'tournament_id' => $tournamentId,
                                    'event_id' => $eventId,
                                    'team_id' => $groupTeamId,
                                    'event' => $group['event'],
                                    'team' => $group['team'],
                                    'medal_counts' => $group['medal_counts'],
                                    'players' => $group['players'],
                                    'used_in_promotion' => $usedInPromotion !== null,
                                    'used_promotion_id' => $usedInPromotion?->coach_promotion_id,
                                    'used_in_reward' => $usedInReward !== null,
                                    'used_reward_id' => $usedInReward?->coach_promotion_id,
                                ];
                            })->values()->all();

                            return [
                                'id' => $this->rewardTournamentEvidenceKey(
                                    $sessionId,
                                    $tournamentId,
                                    $teamId,
                                ),
                                'session_id' => $sessionId,
                                'tournament_id' => $tournamentId,
                                'team_id' => $teamId,
                                'tournament' => $first['tournament'],
                                'team' => $first['team'],
                                'event_count' => count($events),
                                'player_count' => $tournamentGroups->sum(fn (array $group): int => count($group['players'])),
                                'events' => $events,
                            ];
                        })
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $sessionGroup): bool => count($sessionGroup['tournaments']) > 0)
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function emptyAchievementsPayload(): array
    {
        return [
            'summary' => [
                'GOLD' => 0,
                'SILVER' => 0,
                'BRONZE' => 0,
                'MERIT' => 0,
                'total_events' => 0,
                'medal_winning_players' => 0,
            ],
            'groups' => [],
        ];
    }

    /**
     * @param  Collection<int, Achievement>  $achievements
     * @param  Collection<string, Collection<int, CoachPromotionEvidence>>  $rewardEvidenceByKey
     * @return array<string, mixed>
     */
    private function coachAchievementGroupPayload(Collection $achievements, Collection $rewardEvidenceByKey): array
    {
        $first = $achievements->first();
        $participation = $first->participation;
        $event = $participation->event;
        $tournament = $event->tournament;
        $medalCounts = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];
        $rewardKey = $this->rewardEvidenceKey(
            $participation->session_id,
            $tournament->id,
            $event->id,
            (int) $participation->team_id,
        );
        $rewardTournamentKey = $this->rewardTournamentEvidenceKey(
            $participation->session_id,
            $tournament->id,
            (int) $participation->team_id,
        );

        $uniqueAchievements = $achievements->unique(function (Achievement $achievement): string {
            $participation = $achievement->participation;
            if ($participation->event?->event_type === 'team') {
                return $participation->event_id.':'.$participation->team_id.':'.$participation->session_id.':'.$achievement->medal_type;
            }

            return (string) $achievement->id;
        });

        foreach ($uniqueAchievements as $achievement) {
            if ($this->countsForCoachMedalSummary($achievement) && array_key_exists($achievement->medal_type, $medalCounts)) {
                $medalCounts[$achievement->medal_type]++;
            }
        }

        return [
            'id' => $this->teamSessionKey($participation->team_id, $participation->session_id).':'.$event->id,
            'session' => [
                'id' => $participation->session->id,
                'name' => $participation->session->name,
                'is_current' => (bool) $participation->session->is_current,
            ],
            'team' => [
                'id' => $participation->team->id,
                'name' => $participation->team->name,
            ],
            'tournament' => [
                'id' => $tournament->id,
                'name' => $tournament->name,
                'tier_code' => $tournament->tier?->code,
                'tier_weight' => $tournament->tier?->weight,
                'tier_label' => $tournament->tier?->label,
                'tier_label_en' => $tournament->tier?->label_en,
                'tier_label_hi' => $tournament->tier?->label_hi,
                'date_from' => $tournament->date_from?->toDateString(),
                'date_to' => $tournament->date_to?->toDateString(),
                'venue' => $tournament->venue,
                'sport' => $tournament->sport ? [
                    'id' => $tournament->sport->id,
                    'name' => $tournament->sport->name,
                ] : null,
            ],
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'gender_class' => $event->gender_class,
                'discipline' => $event->discipline,
                'weight_category' => $event->weight_category,
                'event_type' => $event->event_type,
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ],
            'medal_counts' => $medalCounts,
            'rewards' => $this->coachRewardEvidencePayload($rewardEvidenceByKey->get($rewardKey, collect())->merge($rewardEvidenceByKey->get($rewardTournamentKey, collect()))),
            'promotions' => $this->coachPromotionUsagePayload($rewardEvidenceByKey->get($rewardKey, collect())->merge($rewardEvidenceByKey->get($rewardTournamentKey, collect()))),
            'players' => $achievements
                ->flatMap(fn (Achievement $achievement): array => $this->achievementPlayerRows($achievement))
                ->sortBy(fn (array $player): string => mb_strtolower((string) ($player['member']['full_name'] ?? '')))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function achievementPlayerRows(Achievement $achievement): array
    {
        $participation = $achievement->participation;
        $member = $participation->member;

        if ($member === null) {
            return [];
        }

        return [[
            'achievement_id' => $achievement->id,
            'participation_id' => $achievement->participation_id,
            'medal_type' => $achievement->medal_type,
            'position' => $achievement->position,
            'participation_position' => $participation->position,
            'remarks' => $achievement->remarks,
            'benefits' => $this->achievementBenefitsPayload($achievement->benefits),
            'member' => [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'pno' => $member->pno,
                'is_coach' => $member->coach !== null,
                'coach_id' => $member->coach?->id,
            ],
        ]];
    }

    /** @param  Collection<int, CoachPromotionEvidence>  $evidences */
    private function coachRewardEvidencePayload(Collection $evidences): array
    {
        return $evidences
            ->map(fn (CoachPromotionEvidence $evidence): array => [
                'id' => $evidence->id,
                'coach_promotion_id' => $evidence->coach_promotion_id,
                'cash_reward_amount' => $evidence->coachPromotion?->cash_reward_amount,
                'cash_reward_date' => $evidence->coachPromotion?->cash_reward_date?->toDateString(),
                'cash_reward_reference' => $evidence->coachPromotion?->cash_reward_reference,
            ])
            ->filter(fn (array $reward): bool => $reward['cash_reward_amount'] !== null || $reward['cash_reward_date'] !== null || $reward['cash_reward_reference'] !== null)
            ->unique('coach_promotion_id')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, CoachPromotionEvidence>  $evidences
     * @return array<int, array<string, mixed>>
     */
    private function coachPromotionUsagePayload(Collection $evidences): array
    {
        return $evidences
            ->map(fn (CoachPromotionEvidence $evidence): array => [
                'id' => $evidence->id,
                'coach_promotion_id' => $evidence->coach_promotion_id,
                'to_rank' => $evidence->coachPromotion?->to_rank,
                'promotion_date' => $evidence->coachPromotion?->promotion_date?->toDateString(),
            ])
            ->filter(fn (array $promotion): bool => $promotion['to_rank'] !== null)
            ->unique('coach_promotion_id')
            ->values()
            ->all();
    }

    private function countsForCoachMedalSummary(Achievement $achievement): bool
    {
        return ($achievement->participation->event->tournament->tier?->code ?? 'OTHER') !== 'OTHER';
    }

    private function achievementFallsWithinAssignment(Achievement $achievement, CoachAssignment $assignment): bool
    {
        $tournamentDate = $achievement->participation->event->tournament->date_from;

        if ($tournamentDate === null) {
            return true;
        }

        if ($assignment->assigned_at !== null && $tournamentDate->lt($assignment->assigned_at->toDateString())) {
            return false;
        }

        if ($assignment->removed_at !== null && $tournamentDate->gt($assignment->removed_at->toDateString())) {
            return false;
        }

        return true;
    }

    /** @param  Collection<int, mixed>  $benefits */
    private function achievementBenefitsPayload(Collection $benefits): array
    {
        return $benefits->map(fn ($benefit): array => [
            'id' => $benefit->id,
            'benefit_type' => $benefit->benefit_type,
            'promoted_from_rank' => $benefit->promoted_from_rank,
            'promoted_to_rank' => $benefit->promoted_to_rank,
            'cash_amount' => $benefit->cash_amount,
            'benefit_date' => $benefit->benefit_date?->toDateString(),
            'order_reference' => $benefit->order_reference,
            'remarks' => $benefit->remarks,
        ])->values()->all();
    }

    private function teamSessionKey(int $teamId, int $sessionId): string
    {
        return $teamId.':'.$sessionId;
    }

    private function memberTeamSessionKey(int $memberId, int $teamId, int $sessionId): string
    {
        return $memberId.':'.$teamId.':'.$sessionId;
    }

    private function rewardEvidenceKey(int $sessionId, int $tournamentId, int $eventId, int $teamId): string
    {
        return $sessionId.':'.$tournamentId.':'.$eventId.':'.$teamId;
    }

    private function rewardTournamentEvidenceKey(int $sessionId, int $tournamentId, int $teamId): string
    {
        return $sessionId.':'.$tournamentId.':'.$teamId;
    }

    /**
     * Promotion/reward evidence rows don't carry a single achievement_id (a coached event can
     * cite several players' medals at once), so the medal counts shown against each evidence row
     * are looked up from the same achievement groups used to build the evidence picker.
     *
     * @param  array<int, array<string, mixed>>  $achievementGroups
     * @return array<string, mixed>
     */
    private function evidenceMedalCountsIndex(array $achievementGroups): array
    {
        $byEvent = [];
        $byTournament = [];
        $byEventPlayers = [];
        $byTournamentPlayers = [];

        foreach ($achievementGroups as $group) {
            $sessionId = (int) $group['session']['id'];
            $tournamentId = (int) $group['tournament']['id'];
            $eventId = (int) $group['event']['id'];
            $teamId = (int) $group['team']['id'];
            $medalCounts = $group['medal_counts'];
            $players = collect($group['players'])
                ->map(fn (array $player): array => [
                    'member' => $player['member'],
                    'medal_type' => $player['medal_type'],
                ])
                ->values()
                ->all();

            $eventKey = $this->rewardEvidenceKey($sessionId, $tournamentId, $eventId, $teamId);
            $byEvent[$eventKey] = $medalCounts;
            $byEventPlayers[$eventKey] = $players;

            $tournamentKey = $this->rewardTournamentEvidenceKey($sessionId, $tournamentId, $teamId);
            $running = $byTournament[$tournamentKey] ?? ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

            foreach ($medalCounts as $medalType => $count) {
                $running[$medalType] = ($running[$medalType] ?? 0) + $count;
            }

            $byTournament[$tournamentKey] = $running;
            $byTournamentPlayers[$tournamentKey] = collect($byTournamentPlayers[$tournamentKey] ?? [])
                ->merge($players)
                ->unique(fn (array $player): string => $player['member']['id'].':'.$player['medal_type'])
                ->values()
                ->all();
        }

        return [
            'event' => $byEvent,
            'tournament' => $byTournament,
            'eventPlayers' => $byEventPlayers,
            'tournamentPlayers' => $byTournamentPlayers,
        ];
    }

    /**
     * @param  array<string, mixed>  $coachData
     * @param  array<int, array<string, mixed>>  $achievementGroups
     * @return array<string, mixed>
     */
    private function attachEvidenceMedalCounts(array $coachData, array $achievementGroups): array
    {
        if (empty($coachData['coach']['promotions'])) {
            return $coachData;
        }

        $index = $this->evidenceMedalCountsIndex($achievementGroups);

        // Both levels are Collections (built via ->map()->values() in CoachResource, not
        // ->all()), so mutating them with a foreach-by-reference silently no-ops. Rebuild
        // immutably instead.
        $coachData['coach']['promotions'] = collect($coachData['coach']['promotions'])
            ->map(function (array $promotion) use ($index): array {
                $promotion['evidences'] = collect($promotion['evidences'])
                    ->map(function (array $evidence) use ($index): array {
                        if ($evidence['event_id'] !== null) {
                            $key = $this->rewardEvidenceKey((int) $evidence['session_id'], (int) $evidence['tournament_id'], (int) $evidence['event_id'], (int) $evidence['team_id']);
                            $evidence['medal_counts'] = $index['event'][$key] ?? [];
                            $evidence['players'] = $index['eventPlayers'][$key] ?? [];
                        } else {
                            $key = $this->rewardTournamentEvidenceKey((int) $evidence['session_id'], (int) $evidence['tournament_id'], (int) $evidence['team_id']);
                            $evidence['medal_counts'] = $index['tournament'][$key] ?? [];
                            $evidence['players'] = $index['tournamentPlayers'][$key] ?? [];
                        }

                        return $evidence;
                    })
                    ->values()
                    ->all();

                return $promotion;
            })
            ->values()
            ->all();

        return $coachData;
    }
}
