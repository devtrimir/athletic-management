<?php

declare(strict_types=1);

namespace App\Support\Coaches;

use App\Http\Resources\CoachAliasResource;
use App\Http\Resources\CoachResource;
use App\Http\Resources\CoachStatusHistoryResource;
use App\Models\Achievement;
use App\Models\Coach;
use App\Models\CoachAssignment;
use App\Models\Rank;
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
            'sports' => fn ($query) => $query->withPivot(['is_primary', 'level_master_id', 'level', 'sport_event', 'effective_from', 'effective_to', 'notes']),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'sports',
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
        $coach->loadMissing('certifications:id,coach_id,name,certificate_type,issuer,issued_at,expired_at,attachment_path,metadata');

        return [
            ...$this->shell($coach),
            'activeTab' => 'certifications',
        ];
    }

    /** @return array<string, mixed> */
    public function events(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'events',
        ];
    }

    /** @return array<string, mixed> */
    public function achievements(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'achievements',
            'coachAchievements' => $this->achievementsPayload($coach),
        ];
    }

    /** @return array<string, mixed> */
    public function performance(Coach $coach): array
    {
        return [
            ...$this->shell($coach),
            'activeTab' => 'performance',
        ];
    }

    /** @return array<string, mixed> */
    public function promotions(Coach $coach): array
    {
        $coach->loadMissing([
            'promotions' => fn ($query) => $query
                ->with('recorder:id,name')
                ->orderByDesc('promotion_date')
                ->orderByDesc('id'),
        ]);

        return [
            ...$this->shell($coach),
            'activeTab' => 'promotions',
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
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
    private function shell(Coach $coach): array
    {
        $coach->loadMissing([
            'district:id,name',
            'unit:id,name,district_id',
            'nisMaster:id,kind,code,name,short_name',
            'tierMaster:id,code,label_hi,label_en,weight',
            'rankMaster:id,code,name,short_name',
            'designationMaster:id,code,name,short_name',
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
                'participation.session:id,name,is_current',
                'participation.team:id,name',
                'participation.event:id,tournament_id,sport_id,name,gender_class,discipline,weight_category',
                'participation.event.sport:id,name',
                'participation.event.tournament:id,name,tier_id,date_from,date_to,venue,session_id,sport_id',
                'participation.event.tournament.sport:id,name',
                'participation.event.tournament.tier:id,code,weight',
                'benefits',
            ])
            ->orderByDesc('id')
            ->get()
            ->filter(function (Achievement $achievement) use ($assignmentsByPair, $membershipKeys): bool {
                $participation = $achievement->participation;

                if ($participation->team_id === null) {
                    return false;
                }

                if (! $membershipKeys->has($this->memberTeamSessionKey($participation->member_id, $participation->team_id, $participation->session_id))) {
                    return false;
                }

                $assignments = $assignmentsByPair->get($this->teamSessionKey($participation->team_id, $participation->session_id), collect());

                return $assignments->contains(fn (CoachAssignment $assignment): bool => $this->achievementFallsWithinAssignment($achievement, $assignment));
            })
            ->values();

        if ($achievements->isEmpty()) {
            return $this->emptyAchievementsPayload();
        }

        $summary = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        $countableAchievements = $achievements->filter(
            fn (Achievement $achievement): bool => $this->countsForCoachMedalSummary($achievement)
        );

        foreach ($countableAchievements as $achievement) {
            if (array_key_exists($achievement->medal_type, $summary)) {
                $summary[$achievement->medal_type]++;
            }
        }

        $groups = $achievements
            ->groupBy(fn (Achievement $achievement): string => collect([
                $achievement->participation->session_id,
                $achievement->participation->event->tournament->tier?->code ?? 'OTHER',
                $achievement->participation->event->tournament->id,
                $achievement->participation->event->id,
                $achievement->participation->team_id,
            ])->join(':'))
            ->map(fn (Collection $group): array => $this->coachAchievementGroupPayload($group))
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
                'medal_winning_players' => $countableAchievements->pluck('participation.member_id')->unique()->count(),
            ],
            'groups' => $groups,
        ];
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

    /** @param  Collection<int, Achievement>  $achievements */
    private function coachAchievementGroupPayload(Collection $achievements): array
    {
        $first = $achievements->first();
        $participation = $first->participation;
        $event = $participation->event;
        $tournament = $event->tournament;
        $medalCounts = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'MERIT' => 0];

        foreach ($achievements as $achievement) {
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
                'sport' => $event->sport ? [
                    'id' => $event->sport->id,
                    'name' => $event->sport->name,
                ] : null,
            ],
            'medal_counts' => $medalCounts,
            'players' => $achievements
                ->sortBy(fn (Achievement $achievement): string => $achievement->participation->member->full_name)
                ->map(fn (Achievement $achievement): array => [
                    'achievement_id' => $achievement->id,
                    'participation_id' => $achievement->participation_id,
                    'member' => [
                        'id' => $achievement->participation->member->id,
                        'full_name' => $achievement->participation->member->full_name,
                        'pno' => $achievement->participation->member->pno,
                    ],
                    'medal_type' => $achievement->medal_type,
                    'position' => $achievement->position,
                    'participation_position' => $achievement->participation->position,
                    'remarks' => $achievement->remarks,
                    'benefits' => $this->achievementBenefitsPayload($achievement->benefits),
                ])
                ->values()
                ->all(),
        ];
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
}
