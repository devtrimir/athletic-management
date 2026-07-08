<?php

declare(strict_types=1);

namespace App\Support\Members;

use App\Http\Resources\MemberResource;
use App\Http\Resources\MemberStatusHistoryResource;
use App\Http\Resources\NameAliasResource;
use App\Models\Achievement;
use App\Models\Designation;
use App\Models\District;
use App\Models\ExternalCoachingAssignment;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\ExternalTrainingAttendance;
use App\Models\MediaFile;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\MemberSpecialAchievement;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Services\AuditLogBuilder;
use App\Services\Performance\MemberPerformanceService;
use Illuminate\Support\Collection;

class MemberProfileData
{
    public function __construct(
        private readonly AuditLogBuilder $auditLogBuilder,
        private readonly MemberPerformanceService $memberPerformance,
    ) {}

    /** @return array<string, mixed> */
    public function overview(Member $member): array
    {
        return [
            ...$this->shell($member),
            ...$this->referenceData(),
            'activeTab' => 'overview',
        ];
    }

    /** @return array<string, mixed> */
    public function teams(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'teams',
            'memberTeams' => $this->teamsPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function events(Member $member): array
    {
        return [
            ...$this->shell($member),
            ...$this->referenceData(),
            'activeTab' => 'events',
            'participations' => $this->participationsPayload($member),
            'achievementsData' => $this->achievementsPayload($member),
            'promotions' => $this->promotionsPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function performance(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'performance',
            'performance' => $this->memberPerformance->run((int) $member->organization_id, (int) $member->id),
        ];
    }

    /** @return array<string, mixed> */
    public function externalCoaching(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'external-coaching',
            'externalCoaching' => $this->externalCoachingPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function specialAchievements(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'special-achievements',
            'specialAchievements' => $this->specialAchievementsPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function promotions(Member $member): array
    {
        return [
            ...$this->shell($member),
            ...$this->referenceData(),
            'activeTab' => 'promotions',
            'participations' => $this->participationsPayload($member),
            'achievementsData' => $this->achievementsPayload($member),
            'promotions' => $this->promotionsPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'changelog',
            'auditLog' => $this->auditLogBuilder->forMember($member),
        ];
    }

    /** @return array<string, mixed> */
    public function media(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'media',
            'media' => $this->mediaPayload($member),
        ];
    }

    /** @return array<string, mixed> */
    public function status(Member $member): array
    {
        return [
            ...$this->shell($member),
            'activeTab' => 'status',
            'statusHistory' => MemberStatusHistoryResource::collection(
                $member->statusHistory()->with('recorder')->get()
            )->resolve(),
            'aliases' => NameAliasResource::collection($member->aliases()->get())->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    public function print(Member $member): array
    {
        return [
            ...$this->shell($member),
            'statusHistory' => MemberStatusHistoryResource::collection(
                $member->statusHistory()->with('recorder')->get()
            )->resolve(),
            'memberTeams' => $this->teamsPayload($member),
            'achievements' => $this->achievementsPayload($member)['achievements'],
            'specialAchievements' => $this->specialAchievementsPayload($member),
            'externalCoaching' => $this->externalCoachingPayload($member),
            'promotions' => $this->promotionsPayload($member),
            'auditLog' => $this->auditLogBuilder->forMember($member),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Member $member): array
    {
        $member->loadMissing(['homeDistrict', 'postingDistrict', 'currentUnit', 'sport', 'playableSports']);

        return [
            'member' => (new MemberResource($member))->resolve(),
        ];
    }

    /** @return array<string, mixed> */
    private function referenceData(): array
    {
        return [
            'districts' => District::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name']),
            'sports' => Sport::orderBy('name')->get(['id', 'name']),
            'sessions' => SportSession::select(['id', 'name', 'is_current'])
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['code', 'name', 'short_name', 'mapped_rank_code']),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function teamsPayload(Member $member): array
    {
        return TeamMember::where('member_id', $member->id)
            ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (TeamMember $teamMember): array => [
                'id' => $teamMember->id,
                'role' => $teamMember->role,
                'joined_on' => $teamMember->joined_on?->toDateString(),
                'left_on' => $teamMember->left_on?->toDateString(),
                'team' => $teamMember->team ? ['id' => $teamMember->team->id, 'name' => $teamMember->team->name] : null,
                'sport' => $teamMember->team?->sport ? ['id' => $teamMember->team->sport->id, 'name' => $teamMember->team->sport->name] : null,
                'session' => $teamMember->session ? ['id' => $teamMember->session->id, 'name' => $teamMember->session->name] : null,
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function externalCoachingPayload(Member $member): array
    {
        return [
            'assignments' => ExternalCoachingAssignment::query()
                ->with(['externalCoach:id,name,email,phone', 'trainingVenue:id,name', 'sport:id,name'])
                ->where('member_id', $member->id)
                ->latest('start_date')
                ->get()
                ->map(fn (ExternalCoachingAssignment $assignment): array => [
                    'id' => $assignment->id,
                    'start_date' => $assignment->start_date?->toDateString(),
                    'end_date' => $assignment->end_date?->toDateString(),
                    'status' => $assignment->status,
                    'attendance_mode' => $assignment->attendance_mode,
                    'external_coach' => $assignment->externalCoach ? [
                        'id' => $assignment->externalCoach->id,
                        'name' => $assignment->externalCoach->name,
                    ] : null,
                    'training_venue' => $assignment->trainingVenue ? [
                        'id' => $assignment->trainingVenue->id,
                        'name' => $assignment->trainingVenue->name,
                    ] : null,
                    'sport' => $assignment->sport ? [
                        'id' => $assignment->sport->id,
                        'name' => $assignment->sport->name,
                    ] : null,
                ])
                ->all(),
            'attendances' => ExternalTrainingAttendance::query()
                ->with(['externalCoach:id,name', 'trainingVenue:id,name', 'assignment:id,sport_id', 'assignment.sport:id,name'])
                ->where('member_id', $member->id)
                ->latest('attendance_date')
                ->limit(50)
                ->get()
                ->map(fn (ExternalTrainingAttendance $attendance): array => [
                    'id' => $attendance->id,
                    'attendance_date' => $attendance->attendance_date?->toDateString(),
                    'attendance_status' => $attendance->attendance_status,
                    'geo_status' => $attendance->geo_status,
                    'review_status' => $attendance->review_status,
                    'distance_from_venue_meters' => $attendance->distance_from_venue_meters,
                    'flag_reason' => $attendance->flag_reason,
                    'external_coach' => $attendance->externalCoach ? ['name' => $attendance->externalCoach->name] : null,
                    'training_venue' => $attendance->trainingVenue ? ['name' => $attendance->trainingVenue->name] : null,
                    'sport' => $attendance->assignment?->sport ? ['name' => $attendance->assignment->sport->name] : null,
                ])
                ->all(),
            'performanceUpdates' => ExternalCoachPerformanceUpdate::query()
                ->with(['externalCoach:id,name', 'sport:id,name'])
                ->where('member_id', $member->id)
                ->latest('update_date')
                ->limit(50)
                ->get()
                ->map(fn (ExternalCoachPerformanceUpdate $update): array => [
                    'id' => $update->id,
                    'update_date' => $update->update_date?->toDateString(),
                    'performance_level' => $update->performance_level,
                    'performance_score' => $update->performance_score,
                    'training_summary' => $update->training_summary,
                    'review_status' => $update->review_status,
                    'external_coach' => $update->externalCoach ? ['name' => $update->externalCoach->name] : null,
                    'sport' => $update->sport ? ['name' => $update->sport->name] : null,
                ])
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function achievementsPayload(Member $member): array
    {
        $achievements = Achievement::whereHas(
            'participation',
            fn ($query) => $query->where('member_id', $member->id),
        )
            ->with([
                'participation.session:id,name',
                'participation.event:id,tournament_id,name',
                'participation.event.tournament:id,name,tier_id,date_from,date_to,venue',
                'participation.event.tournament.tier:id,code,weight',
                'benefits',
            ])
            ->orderByDesc('id')
            ->get();

        $summary = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        foreach ($achievements as $achievement) {
            if (array_key_exists($achievement->medal_type, $summary)) {
                $summary[$achievement->medal_type]++;
            }
        }

        return [
            'summary' => $summary,
            'achievements' => $achievements
                ->map(fn (Achievement $achievement): array => [
                    'id' => $achievement->id,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'participation_position' => $achievement->participation->position,
                    'remarks' => $achievement->remarks,
                    'session' => [
                        'id' => $achievement->participation->session->id,
                        'name' => $achievement->participation->session->name,
                    ],
                    'tournament' => [
                        'id' => $achievement->participation->event->tournament->id,
                        'name' => $achievement->participation->event->tournament->name,
                        'tier_code' => $achievement->participation->event->tournament->tier->code ?? null,
                        'tier_weight' => $achievement->participation->event->tournament->tier->weight ?? null,
                        'date_from' => $achievement->participation->event->tournament->date_from?->toDateString(),
                        'date_to' => $achievement->participation->event->tournament->date_to?->toDateString(),
                        'venue' => $achievement->participation->event->tournament->venue,
                    ],
                    'event' => [
                        'id' => $achievement->participation->event->id,
                        'name' => $achievement->participation->event->name,
                    ],
                    'benefits' => $this->achievementBenefitsPayload($achievement->benefits),
                ])
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function specialAchievementsPayload(Member $member): array
    {
        $records = $member->specialAchievements()
            ->get()
            ->map(fn (MemberSpecialAchievement $achievement): array => [
                'id' => $achievement->id,
                'achievement_type' => $achievement->achievement_type,
                'title' => $achievement->title,
                'awarded_on' => $achievement->awarded_on?->toDateString(),
                'issuing_authority' => $achievement->issuing_authority,
                'order_reference' => $achievement->order_reference,
                'order_document' => $achievement->order_document_path ? [
                    'path' => $achievement->order_document_path,
                    'url' => route('members.special-achievements.order-document.preview', [$member, $achievement]),
                    'preview_url' => route('members.special-achievements.order-document.preview', [$member, $achievement]),
                    'download_url' => route('members.special-achievements.order-document', [$member, $achievement]),
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

    /** @return array<int, array<string, mixed>> */
    private function participationsPayload(Member $member): array
    {
        return Participation::where('member_id', $member->id)
            ->with([
                'session:id,name,is_current',
                'team:id,name',
                'event:id,tournament_id,sport_id,name,gender_class,discipline,weight_category',
                'event.sport:id,name',
                'event.tournament:id,name,tier_id,date_from,date_to,venue,session_id,sport_id',
                'event.tournament.sport:id,name',
                'event.tournament.tier:id,code,weight',
                'achievement:id,participation_id,medal_type,position,remarks',
                'achievement.benefits',
            ])
            ->withCount('media')
            ->orderByDesc('session_id')
            ->get()
            ->groupBy('session_id')
            ->map(fn (Collection $group): array => [
                'session' => [
                    'id' => $group->first()->session->id,
                    'name' => $group->first()->session->name,
                    'is_current' => (bool) $group->first()->session->is_current,
                ],
                'participations' => $group
                    ->map(fn (Participation $participation): array => [
                        'id' => $participation->id,
                        'position' => $participation->position,
                        'media_files_count' => $participation->media_count,
                        'tournament' => [
                            'id' => $participation->event->tournament->id,
                            'name' => $participation->event->tournament->name,
                            'tier_code' => $participation->event->tournament->tier->code ?? null,
                            'tier_weight' => $participation->event->tournament->tier->weight ?? null,
                            'date_from' => $participation->event->tournament->date_from?->toDateString(),
                            'date_to' => $participation->event->tournament->date_to?->toDateString(),
                            'venue' => $participation->event->tournament->venue,
                            'sport' => $participation->event->tournament->sport ? [
                                'id' => $participation->event->tournament->sport->id,
                                'name' => $participation->event->tournament->sport->name,
                            ] : null,
                            'session_id' => $participation->event->tournament->session_id,
                        ],
                        'event' => [
                            'id' => $participation->event->id,
                            'name' => $participation->event->name,
                            'gender_class' => $participation->event->gender_class,
                            'discipline' => $participation->event->discipline,
                            'weight_category' => $participation->event->weight_category,
                            'sport' => $participation->event->sport ? [
                                'id' => $participation->event->sport->id,
                                'name' => $participation->event->sport->name,
                            ] : null,
                        ],
                        'team' => $participation->team ? [
                            'id' => $participation->team->id,
                            'name' => $participation->team->name,
                        ] : null,
                        'achievement' => $participation->achievement ? [
                            'id' => $participation->achievement->id,
                            'medal_type' => $participation->achievement->medal_type,
                            'position' => $participation->achievement->position,
                            'remarks' => $participation->achievement->remarks,
                            'benefits' => $this->achievementBenefitsPayload($participation->achievement->benefits),
                        ] : null,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function promotionsPayload(Member $member): array
    {
        return MemberPromotion::where('member_id', $member->id)
            ->with(['evidences', 'recorder'])
            ->orderByDesc('promotion_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (MemberPromotion $promotion): array => [
                'id' => $promotion->id,
                'promotion_date' => $promotion->promotion_date?->toDateString(),
                'from_rank' => $promotion->from_rank,
                'to_rank' => $promotion->to_rank,
                'cash_reward_amount' => $promotion->cash_reward_amount,
                'cash_reward_date' => $promotion->cash_reward_date?->toDateString(),
                'cash_reward_reference' => $promotion->cash_reward_reference,
                'cash_reward_remarks' => $promotion->cash_reward_remarks,
                'reason' => $promotion->reason,
                'remarks' => $promotion->remarks,
                'recorded_by_name' => $promotion->recorder?->name,
                'evidences' => $promotion->evidences
                    ->map(fn (PromotionEvidence $evidence): array => $this->promotionEvidencePayload($evidence))
                    ->all(),
            ])
            ->all();
    }

    /** @return array<string, mixed> */
    private function promotionEvidencePayload(PromotionEvidence $evidence): array
    {
        $resolvedType = $this->resolvePromotionEvidenceType($evidence->evidencable_type);

        $payload = [
            'id' => $evidence->id,
            'type' => $resolvedType ?? $evidence->evidencable_type,
            'evidence_id' => $evidence->evidencable_id,
            'summary' => null,
        ];

        if ($resolvedType === null) {
            return $payload;
        }

        if ($resolvedType === 'participation') {
            $participation = Participation::query()
                ->with([
                    'session:id,name',
                    'event:id,tournament_id,name,gender_class',
                    'event.tournament:id,name,tier_id,date_from,date_to,venue',
                    'event.tournament.tier:id,code',
                    'achievement.benefits',
                ])
                ->find($evidence->evidencable_id);

            if ($participation === null) {
                return $payload;
            }

            $achievement = $participation->achievement;
            $tournament = $participation->event?->tournament;

            return array_merge($payload, [
                'summary' => collect([
                    $participation->session?->name,
                    $tournament?->name,
                    $participation->event?->name,
                    $tournament?->date_from?->toDateString(),
                    $participation->event?->gender_class,
                    $achievement?->medal_type,
                    $participation->position ? '#'.$participation->position : null,
                ])->filter()->join(' · '),
                'session' => $participation->session ? [
                    'id' => $participation->session->id,
                    'name' => $participation->session->name,
                ] : null,
                'tournament' => $tournament ? [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'tier_code' => $tournament->tier?->code,
                    'date_from' => $tournament->date_from?->toDateString(),
                    'date_to' => $tournament->date_to?->toDateString(),
                    'venue' => $tournament->venue,
                ] : null,
                'event' => $participation->event ? [
                    'id' => $participation->event->id,
                    'name' => $participation->event->name,
                    'gender_class' => $participation->event->gender_class,
                ] : null,
                'achievement' => $achievement ? [
                    'id' => $achievement->id,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'benefits' => $this->achievementBenefitsPayload($achievement->benefits),
                ] : null,
            ]);
        }

        if ($resolvedType === 'achievement') {
            $achievement = Achievement::query()
                ->with([
                    'participation.session:id,name',
                    'participation.event:id,tournament_id,name,gender_class',
                    'participation.event.tournament:id,name,tier_id,date_from,date_to,venue',
                    'participation.event.tournament.tier:id,code',
                    'benefits',
                ])
                ->find($evidence->evidencable_id);

            if ($achievement === null) {
                return $payload;
            }

            $participation = $achievement->participation;
            $event = $participation?->event;
            $tournament = $event?->tournament;

            return array_merge($payload, [
                'summary' => collect([
                    $achievement->medal_type,
                    $participation?->session?->name,
                    $tournament?->name,
                    $event?->name,
                    $tournament?->tier?->code,
                    $achievement->position ? '#'.$achievement->position : null,
                ])->filter()->join(' · '),
                'session' => $participation?->session ? [
                    'id' => $participation->session->id,
                    'name' => $participation->session->name,
                ] : null,
                'tournament' => $tournament ? [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'tier_code' => $tournament->tier?->code,
                    'date_from' => $tournament->date_from?->toDateString(),
                    'date_to' => $tournament->date_to?->toDateString(),
                    'venue' => $tournament->venue,
                ] : null,
                'event' => $event ? [
                    'id' => $event->id,
                    'name' => $event->name,
                    'gender_class' => $event->gender_class,
                ] : null,
                'achievement' => [
                    'id' => $achievement->id,
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'benefits' => $this->achievementBenefitsPayload($achievement->benefits),
                ],
            ]);
        }

        return $payload;
    }

    /** @return array<int, array<string, mixed>> */
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

    private function resolvePromotionEvidenceType(string $type): ?string
    {
        return match ($type) {
            'participation', Participation::class => 'participation',
            'achievement', Achievement::class => 'achievement',
            default => null,
        };
    }

    /** @return array<string, mixed> */
    private function mediaPayload(Member $member): array
    {
        $mediaFiles = MediaFile::with(['uploader:id,name', 'mediable'])
            ->where('organization_id', $member->organization_id)
            ->where('mediable_type', Participation::class)
            ->whereIn('mediable_id', $member->participations()->pluck('id'))
            ->orderByDesc('created_at')
            ->get();

        $participationIds = $mediaFiles
            ->where('mediable_type', Participation::class)
            ->pluck('mediable_id')
            ->unique();

        $participations = Participation::whereIn('id', $participationIds)
            ->with([
                'event:id,tournament_id,sport_id,name',
                'event.tournament:id,name,date_from,tier_id',
                'event.tournament.tier:id,code,label_hi',
                'event.sport:id,name',
                'achievement:participation_id,medal_type',
            ])
            ->get()
            ->keyBy('id');

        $tournaments = $mediaFiles
            ->groupBy(fn (MediaFile $file): int => $participations->get($file->mediable_id)?->event?->tournament_id ?? 0)
            ->map(function (Collection $files, int|string $tournamentId) use ($participations): array {
                $sampleParticipation = $participations
                    ->filter(fn (Participation $participation): bool => $participation->event->tournament_id === (int) $tournamentId)
                    ->first();

                $tournament = $sampleParticipation?->event?->tournament;

                $events = $files
                    ->groupBy(fn (MediaFile $file): int => $participations->get($file->mediable_id)?->event_id ?? 0)
                    ->map(function (Collection $eventFiles, int|string $eventId) use ($participations): array {
                        $sampleParticipation = $participations
                            ->filter(fn (Participation $participation): bool => $participation->event_id === (int) $eventId)
                            ->first();
                        $event = $sampleParticipation?->event;

                        return [
                            'event' => $event ? [
                                'id' => $event->id,
                                'name' => $event->name,
                                'sport' => $event->sport ? ['id' => $event->sport->id, 'name' => $event->sport->name] : null,
                            ] : null,
                            'media' => $eventFiles->values()->map(fn (MediaFile $file): array => [
                                'id' => $file->id,
                                'url' => $file->url(),
                                'original_name' => $file->original_name,
                                'mime_type' => $file->mime_type,
                                'size_bytes' => $file->size_bytes,
                                'caption' => $file->caption,
                                'uploaded_by' => $file->uploader ? [
                                    'id' => $file->uploader->id,
                                    'name' => $file->uploader->name,
                                ] : null,
                                'created_at' => $file->created_at?->toISOString(),
                                'mediable_id' => $file->mediable_id,
                            ])->all(),
                            'count' => $eventFiles->count(),
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'tournament' => $tournament ? [
                        'id' => $tournament->id,
                        'name' => $tournament->name,
                        'date_from' => $tournament->date_from?->toDateString(),
                        'tier' => $tournament->tier ? ['code' => $tournament->tier->code, 'label_hi' => $tournament->tier->label_hi] : null,
                    ] : null,
                    'events' => $events,
                    'total' => $files->count(),
                ];
            })
            ->values()
            ->all();

        return [
            'data' => $tournaments,
            'total' => $mediaFiles->count(),
        ];
    }
}
