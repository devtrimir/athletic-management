<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Http\Resources\MemberStatusHistoryResource;
use App\Http\Resources\NameAliasResource;
use App\Models\Achievement;
use App\Models\AuditLog;
use App\Models\Designation;
use App\Models\District;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Participation;
use App\Models\PromotionEvidence;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TournamentTier;
use App\Models\Unit;
use App\Services\AuditLogBuilder;
use App\Services\MemberCodeGenerator;
use App\Services\Performance\MemberPerformanceService;
use App\Support\Members\MemberProfileData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class MemberController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Member::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $hasStatusScope = array_key_exists('status_scope', $filters);
        $hasCurrentStatus = array_key_exists('current_status', $filters);

        $query = Member::query()
            ->when(
                ! $hasStatusScope && ! $hasCurrentStatus,
                fn ($query) => $query->rosterActive()
            );

        $members = QueryBuilder::for($query)
            ->allowedFilters([
                AllowedFilter::callback('player_category', function ($query, string $value): void {
                    $value === 'SPORTS_QUOTA'
                        ? $query->whereIn('player_category', ['SPORTS_QUOTA', 'SKILLED'])
                        : $query->where('player_category', $value);
                }),
                AllowedFilter::exact('player_level'),
                AllowedFilter::callback('status_scope', fn ($query, string $value): mixed => $this->filterByStatusScope($query, $value)),
                AllowedFilter::callback('current_status', fn ($query, string $value): mixed => $this->filterByCurrentStatus($query, $value)),
                AllowedFilter::exact('home_district_id'),
                AllowedFilter::exact('posting_district_id'),
                AllowedFilter::exact('current_unit_id'),
                AllowedFilter::exact('pno'),
                AllowedFilter::exact('rank'),
                AllowedFilter::exact('designation'),
                AllowedFilter::exact('mobile'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('blood_group'),
                AllowedFilter::callback('sport_id', fn ($query, mixed $value): mixed => $this->filterByPlayableSports($query, $value)),
                AllowedFilter::callback('sport_ids', fn ($query, mixed $value): mixed => $this->filterByPlayableSports($query, $value)),
                AllowedFilter::callback('q', function ($query, string $value): void {
                    $query->where(function ($q) use ($value): void {
                        $q->where('full_name', 'LIKE', "%{$value}%")
                            ->orWhere('full_name_normalized', 'LIKE', "%{$value}%")
                            ->orWhere('pno', 'LIKE', "%{$value}%");
                    });
                }),
                AllowedFilter::callback('joining_year_from', function ($query, string $value): void {
                    $query->whereYear('joining_date', '>=', (int) $value);
                }),
                AllowedFilter::callback('joining_year_to', function ($query, string $value): void {
                    $query->whereYear('joining_date', '<=', (int) $value);
                }),
            ])
            ->allowedSorts(['full_name', 'pno', 'joining_date', 'created_at'])
            ->defaultSort('-created_at')
            ->with([
                'currentUnit:id,name',
                'homeDistrict:id,name',
                'postingDistrict:id,name',
                'sport:id,name',
                'playableSports',
            ])
            ->paginate(min((int) ($request->query('per_page', 25)), 100))
            ->withQueryString();

        $members->getCollection()->transform(function (Member $member): array {
            return array_merge($member->toArray(), [
                'playable_sports' => $member->playableSports->map(fn ($sport): array => [
                    'id' => $sport->id,
                    'name' => $sport->name,
                    'role' => $sport->pivot?->role,
                    'position' => $sport->pivot?->position,
                    'sport_event' => $sport->pivot?->sport_event,
                    'weight' => $sport->pivot?->weight,
                    'notes' => $sport->pivot?->notes,
                ])->values()->all(),
            ]);
        });

        $statusScope = $this->statusScopeFromFilters($filters);
        $levels = TournamentTier::query()
            ->orderByDesc('weight')
            ->get(['code', 'label_en', 'label_hi'])
            ->map(
                fn (TournamentTier $tier): array => [
                    'code' => $tier->code,
                    'label_en' => $tier->label_en,
                    'label_hi' => $tier->label_hi,
                ],
            )
            ->values()
            ->all();

        return Inertia::render('members/index', [
            'members' => $members,
            'filters' => [
                'status_scope' => $statusScope,
                'current_status' => $filters['current_status'] ?? ($statusScope === 'active' ? 'ACTIVE' : null),
                ...$filters,
            ],
            'perPage' => min((int) ($request->query('per_page', 25)), 100),
            'levels' => $levels,
            'units' => Unit::orderBy('name')->get(['id', 'name']),
            'districts' => District::orderBy('name')->get(['id', 'name']),
            'sports' => Sport::orderBy('name')->get(['id', 'name', 'name_en']),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['code', 'name', 'short_name', 'mapped_rank_code']),
            'totalCount' => Member::count(),
        ]);
    }

    private function filterByPlayableSports(mixed $query, mixed $value): mixed
    {
        $sportIds = collect(Arr::wrap($value))
            ->flatMap(fn (mixed $item): array => is_string($item) ? explode(',', $item) : [$item])
            ->map(fn (mixed $item): int => (int) $item)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($sportIds->isEmpty()) {
            return $query;
        }

        return $query->whereHas(
            'playableSports',
            fn ($query) => $query->whereIn('sports.id', $sportIds->all()),
        );
    }

    private function filterByStatusScope(mixed $query, string $value): mixed
    {
        return match ($value) {
            'inactive' => $query->rosterInactive(),
            default => $query->rosterActive(),
        };
    }

    private function filterByCurrentStatus(mixed $query, string $value): mixed
    {
        return $value === 'ACTIVE'
            ? $query->rosterActive()
            : $query->where('current_status', $value);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function statusScopeFromFilters(array $filters): string
    {
        if (($filters['status_scope'] ?? null) === 'inactive') {
            return 'inactive';
        }

        if (($filters['current_status'] ?? null) !== null && $filters['current_status'] !== 'ACTIVE') {
            return 'inactive';
        }

        return 'active';
    }

    public function create(): Response
    {
        Gate::authorize('create', Member::class);

        return Inertia::render('members/create', [
            'districts' => District::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name']),
            'sports' => Sport::orderBy('name')->get(['id', 'name', 'name_en']),
            'sessions' => SportSession::select(['id', 'name', 'is_current'])
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['code', 'name', 'short_name', 'mapped_rank_code']),
        ]);
    }

    public function store(StoreMemberRequest $request, MemberCodeGenerator $generator): RedirectResponse
    {
        Gate::authorize('create', Member::class);

        $orgId = (int) $request->user()->organization_id;
        $data = $request->validated();
        $playableSports = $this->playableSportsPayload($data);
        $playableSports = $this->applySportEventFallback($data, $playableSports);
        unset($data['playable_sports']);

        $member = Member::create(array_merge($data, [
            'organization_id' => $orgId,
            'member_code' => $generator->next($orgId),
        ]));

        $this->syncPlayableSports($member, [], $playableSports);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member created.')]);

        return to_route('members.show', $member);
    }

    public function show(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', $profileData->overview($member));
    }

    public function preview(Member $member, MemberProfileData $profileData): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/print-preview', $profileData->print($member));
    }

    public function edit(Member $member): Response
    {
        Gate::authorize('update', $member);

        return Inertia::render('members/edit', [
            'member' => $member->load(['playableSports']),
            'districts' => District::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name']),
            'sports' => Sport::orderBy('name')->get(['id', 'name', 'name_en']),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['code', 'name', 'short_name', 'mapped_rank_code']),
        ]);
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('update', $member);

        $data = $request->validated();
        $beforePlayableSports = $member->playableSports()->withPivot(['role', 'position', 'sport_event', 'weight', 'notes'])->get();
        $playableSports = $this->playableSportsPayload($data);
        $playableSports = $this->applySportEventFallback($data, $playableSports);
        $shouldSyncPlayableSports = array_key_exists('playable_sports', $data);
        unset($data['playable_sports']);

        $member->update($data);

        if ($shouldSyncPlayableSports) {
            $this->syncPlayableSports($member, $beforePlayableSports, $playableSports);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member updated.')]);

        return to_route('members.show', $member);
    }

    public function destroy(Member $member): RedirectResponse
    {
        Gate::authorize('delete', $member);

        $member->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member deleted.')]);

        return to_route('members.index');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array{sport_id: int, role: string|null, position: string|null, sport_event: string|null, weight: string|null, notes: string|null}>
     */
    private function playableSportsPayload(array $data): array
    {
        return collect($data['playable_sports'] ?? [])
            ->filter(fn (mixed $item): bool => is_array($item) && ! empty($item['sport_id']))
            ->map(fn (array $item): array => [
                'sport_id' => (int) $item['sport_id'],
                'role' => filled($item['role'] ?? null) ? (string) $item['role'] : null,
                'position' => filled($item['position'] ?? null) ? (string) $item['position'] : null,
                'sport_event' => filled($item['sport_event'] ?? null) ? (string) $item['sport_event'] : null,
                'weight' => filled($item['weight'] ?? null) ? (string) $item['weight'] : null,
                'notes' => filled($item['notes'] ?? null) ? (string) $item['notes'] : null,
            ])
            ->unique(fn (array $item): int => $item['sport_id'])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array{sport_id: int, role: string|null, position: string|null, sport_event: string|null, weight: string|null, notes: string|null}>  $playableSports
     * @return array<int, array{sport_id: int, role: string|null, position: string|null, sport_event: string|null, weight: string|null, notes: string|null}>
     */
    private function applySportEventFallback(array $data, array $playableSports): array
    {
        if (empty($playableSports)) {
            return $playableSports;
        }

        $memberSportEvent = filled($data['sport_event'] ?? null) ? (string) $data['sport_event'] : null;

        if ($memberSportEvent === null) {
            return $playableSports;
        }

        foreach ($playableSports as $index => $item) {
            if (! filled($item['sport_event'] ?? null)) {
                $playableSports[$index]['sport_event'] = $memberSportEvent;

                break;
            }
        }

        return $playableSports;
    }

    /**
     * @param  array<int, Sport>|array<int, array<string, mixed>>  $beforeSports
     * @param  array<int, array{sport_id: int, role: string|null, position: string|null, sport_event: string|null, weight: string|null, notes: string|null}>  $afterSports
     */
    private function syncPlayableSports(Member $member, mixed $beforeSports, array $afterSports): void
    {
        $beforeIds = collect($beforeSports)->pluck('id')->all();
        $afterIds = array_map(fn (array $item): int => $item['sport_id'], $afterSports);

        $pivot = [];
        foreach ($afterSports as $item) {
            $pivot[$item['sport_id']] = [
                'role' => $item['role'],
                'position' => $item['position'],
                'sport_event' => $item['sport_event'],
                'weight' => $item['weight'],
                'notes' => $item['notes'],
            ];
        }

        $member->playableSports()->sync($pivot);
        $this->logPlayableSportChanges($member, $beforeIds, $afterIds);
    }

    /**
     * @param  array<int, int>  $beforeIds
     * @param  array<int, int>  $afterIds
     */
    private function logPlayableSportChanges(Member $member, array $beforeIds, array $afterIds): void
    {
        $added = array_values(array_diff($afterIds, $beforeIds));
        $removed = array_values(array_diff($beforeIds, $afterIds));

        foreach ($added as $sportId) {
            AuditLog::create([
                'user_id' => auth()->id(),
                'organization_id' => $member->organization_id,
                'entity' => 'MemberSport',
                'entity_id' => $member->id,
                'action' => 'created',
                'diff' => [
                    'member_id' => $member->id,
                    'sport_id' => $sportId,
                ],
            ]);
        }

        foreach ($removed as $sportId) {
            AuditLog::create([
                'user_id' => auth()->id(),
                'organization_id' => $member->organization_id,
                'entity' => 'MemberSport',
                'entity_id' => $member->id,
                'action' => 'deleted',
                'diff' => [
                    'member_id' => $member->id,
                    'sport_id' => $sportId,
                ],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function memberViewProps(Member $member, AuditLogBuilder $auditLogBuilder, MemberPerformanceService $memberPerformance): array
    {
        $member = $member->load(['homeDistrict', 'postingDistrict', 'currentUnit', 'sport', 'playableSports']);
        $teamIds = TeamMember::query()
            ->where('member_id', $member->id)
            ->pluck('team_id')
            ->unique()
            ->values()
            ->all();

        return [
            'member' => (new MemberResource($member))->resolve(),
            'statusHistory' => Inertia::defer(fn () => MemberStatusHistoryResource::collection(
                $member->statusHistory()->with('recorder')->get()
            )->resolve()),
            'aliases' => Inertia::defer(fn () => NameAliasResource::collection(
                $member->aliases()->get()
            )->resolve()),
            'districts' => District::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name']),
            'sports' => Sport::orderBy('name')->get(['id', 'name', 'name_en']),
            'sessions' => SportSession::select(['id', 'name', 'is_current'])
                ->orderByDesc('start_year')
                ->orderByDesc('id')
                ->get(),
            'ranks' => Rank::active()->ordered()->get(['code', 'name', 'short_name', 'rank_order']),
            'designations' => Designation::active()->ordered()->with('rank:code,name,short_name')->get(['code', 'name', 'short_name', 'mapped_rank_code']),
            'memberTeams' => Inertia::defer(fn () => TeamMember::where('member_id', $member->id)
                ->with(['team:id,name,sport_id', 'team.sport:id,name', 'session:id,name'])
                ->orderByDesc('id')
                ->get()
                ->map(fn ($tm) => [
                    'id' => $tm->id,
                    'role' => $tm->role,
                    'joined_on' => $tm->joined_on?->toDateString(),
                    'left_on' => $tm->left_on?->toDateString(),
                    'team' => $tm->team ? ['id' => $tm->team->id, 'name' => $tm->team->name] : null,
                    'sport' => $tm->team?->sport ? ['id' => $tm->team->sport->id, 'name' => $tm->team->sport->name] : null,
                    'session' => $tm->session ? ['id' => $tm->session->id, 'name' => $tm->session->name] : null,
                ])),
            'eventTeams' => Inertia::defer(fn () => Team::query()
                ->where('organization_id', (int) $member->organization_id)
                ->with('sport:id,name', 'session:id,name,is_current')
                ->orderBy('name')
                ->get()
                ->map(fn (Team $team): array => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'is_active' => (bool) $team->is_active,
                    'sport' => $team->sport ? [
                        'id' => $team->sport->id,
                        'name' => $team->sport->name,
                    ] : null,
                    'session' => $team->session ? [
                        'id' => $team->session->id,
                        'name' => $team->session->name,
                        'is_current' => (bool) $team->session->is_current,
                    ] : null,
                ])),
            'achievements' => Achievement::query()
                ->whereHas('participation', function ($query) use ($member, $teamIds): void {
                    $query
                        ->where('member_id', $member->id)
                        ->orWhereIn('team_id', $teamIds);
                })
                ->with([
                    'participation.session:id,name',
                    'participation.event:id,tournament_id,name',
                    'participation.event.tournament:id,name,tier_id,date_from,date_to,venue',
                    'participation.event.tournament.tier:id,code,weight',
                    'benefits',
                ])
                ->orderByDesc('id')
                ->get()
                ->map(fn (Achievement $achievement) => [
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
                    'benefits' => $achievement->benefits->map(fn ($benefit) => [
                        'id' => $benefit->id,
                        'benefit_type' => $benefit->benefit_type,
                        'promoted_from_rank' => $benefit->promoted_from_rank,
                        'promoted_to_rank' => $benefit->promoted_to_rank,
                        'cash_amount' => $benefit->cash_amount,
                        'benefit_date' => $benefit->benefit_date?->toDateString(),
                        'order_reference' => $benefit->order_reference,
                        'remarks' => $benefit->remarks,
                    ])->all(),
                ])
                ->all(),
            'promotions' => Inertia::defer(fn () => MemberPromotion::where('member_id', $member->id)
                ->with(['evidences', 'recorder'])
                ->orderByDesc('promotion_date')
                ->orderByDesc('id')
                ->get()
                ->map(fn ($promotion) => [
                    'id' => $promotion->id,
                    'promotion_date' => $promotion->promotion_date?->toDateString(),
                    'from_rank' => $promotion->from_rank,
                    'to_rank' => $promotion->to_rank,
                    'reason' => $promotion->reason,
                    'remarks' => $promotion->remarks,
                    'recorded_by_name' => $promotion->recorder?->name,
                    'evidences' => $promotion->evidences
                        ->map(fn (PromotionEvidence $evidence): array => $this->promotionEvidencePayload($evidence))
                        ->all(),
                ])->all()),
            'performance' => Inertia::defer(
                fn () => $memberPerformance->run((int) $member->organization_id, (int) $member->id)
            ),
            'auditLog' => Inertia::defer(fn () => $auditLogBuilder->forMember($member)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
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

    private function resolvePromotionEvidenceType(string $type): ?string
    {
        return match ($type) {
            'participation',
            'App\\Models\\Participation',
            'participations' => 'participation',
            'achievement',
            'App\\Models\\Achievement',
            'achievements' => 'achievement',
            default => null,
        };
    }

    /**
     * @param  iterable<int, mixed>  $benefits
     * @return array<int, array<string, mixed>>
     */
    private function achievementBenefitsPayload(iterable $benefits): array
    {
        return collect($benefits)
            ->map(fn ($benefit): array => [
                'id' => $benefit->id,
                'benefit_type' => $benefit->benefit_type,
                'promoted_from_rank' => $benefit->promoted_from_rank,
                'promoted_to_rank' => $benefit->promoted_to_rank,
                'cash_amount' => $benefit->cash_amount,
                'benefit_date' => $benefit->benefit_date?->toDateString(),
                'order_reference' => $benefit->order_reference,
                'remarks' => $benefit->remarks,
            ])
            ->all();
    }
}
