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
use App\Models\District;
use App\Models\Member;
use App\Models\Participation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Models\User;
use App\Services\MemberCodeGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $members = QueryBuilder::for(Member::class)
            ->allowedFilters([
                AllowedFilter::exact('player_category'),
                AllowedFilter::exact('player_level'),
                AllowedFilter::exact('current_status'),
                AllowedFilter::exact('home_district_id'),
                AllowedFilter::exact('current_unit_id'),
                AllowedFilter::exact('pno'),
                AllowedFilter::exact('mobile'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('blood_group'),
                AllowedFilter::exact('recruitment_type'),
                AllowedFilter::exact('sport_id'),
                AllowedFilter::callback('q', function ($query, string $value): void {
                    $query->where(function ($q) use ($value): void {
                        $q->where('full_name_hi', 'LIKE', "%{$value}%")
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
            ->allowedSorts(['full_name_hi', 'pno', 'joining_date', 'created_at'])
            ->defaultSort('-created_at')
            ->with('currentUnit:id,name_hi')
            ->paginate(min((int) ($request->query('per_page', 25)), 100))
            ->withQueryString();

        return Inertia::render('members/index', [
            'members' => $members,
            'filters' => $request->query('filter', []),
            'perPage' => min((int) ($request->query('per_page', 25)), 100),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'sports' => Sport::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'totalCount' => Member::count(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Member::class);

        return Inertia::render('members/create', [
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'sports' => Sport::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
        ]);
    }

    public function store(StoreMemberRequest $request, MemberCodeGenerator $generator): RedirectResponse
    {
        Gate::authorize('create', Member::class);

        $orgId = (int) $request->user()->organization_id;
        $data = $request->validated();

        $member = Member::create(array_merge($data, [
            'organization_id' => $orgId,
            'member_code' => $generator->next($orgId),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member created.')]);

        return to_route('members.show', $member);
    }

    public function show(Member $member): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', [
            'member' => (new MemberResource($member->load(['homeDistrict', 'currentUnit', 'sport'])))->resolve(),
            'statusHistory' => Inertia::defer(fn () => MemberStatusHistoryResource::collection(
                $member->statusHistory()->with('recorder')->get()
            )->resolve()),
            'aliases' => Inertia::defer(fn () => NameAliasResource::collection(
                $member->aliases()->get()
            )->resolve()),
            'memberTeams' => Inertia::defer(fn () => TeamMember::where('member_id', $member->id)
                ->with(['team:id,name_hi,sport_id', 'team.sport:id,name_hi', 'session:id,name'])
                ->orderByDesc('id')
                ->get()
                ->map(fn ($tm) => [
                    'id' => $tm->id,
                    'role' => $tm->role,
                    'joined_on' => $tm->joined_on?->toDateString(),
                    'left_on' => $tm->left_on?->toDateString(),
                    'team' => $tm->team ? ['id' => $tm->team->id, 'name_hi' => $tm->team->name_hi] : null,
                    'sport' => $tm->team?->sport ? ['id' => $tm->team->sport->id, 'name' => $tm->team->sport->name] : null,
                    'session' => $tm->session ? ['id' => $tm->session->id, 'name' => $tm->session->name] : null,
                ])),
            'legacyAchievements' => Inertia::defer(fn () => $member->legacyAchievements()
                ->with('benefits')
                ->orderBy('period')
                ->orderBy('sort_order')
                ->orderBy('event_date')
                ->get()
                ->map(fn ($la) => [
                    'id' => $la->id,
                    'period' => $la->period,
                    'level' => $la->level,
                    'competition_details' => $la->competition_details,
                    'event_date' => $la->event_date?->toDateString(),
                    'venue' => $la->venue,
                    'sport_discipline' => $la->sport_discipline,
                    'event' => $la->event,
                    'medal_type' => $la->medal_type,
                    'sort_order' => $la->sort_order,
                    'benefits' => $la->benefits->map(fn ($b) => [
                        'id' => $b->id,
                        'benefit_type' => $b->benefit_type,
                        'promoted_from_rank' => $b->promoted_from_rank,
                        'promoted_to_rank' => $b->promoted_to_rank,
                        'cash_amount' => $b->cash_amount,
                        'benefit_date' => $b->benefit_date?->toDateString(),
                        'order_reference' => $b->order_reference,
                        'remarks' => $b->remarks,
                    ])->all(),
                ])->all()),
            'auditLog' => Inertia::defer(fn () => $this->buildAuditLog($member)),
        ]);
    }

    public function edit(Member $member): Response
    {
        Gate::authorize('update', $member);

        return Inertia::render('members/edit', [
            'member' => $member->load('sport'),
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'sports' => Sport::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
        ]);
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('update', $member);

        $member->update($request->validated());

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
     * Build a human-readable audit timeline for a member.
     *
     * Includes changes to the Member itself and to its MemberLegacyAchievements.
     * FK fields (sport_id, current_unit_id, home_district_id) are resolved to
     * their display labels so the frontend needs no extra lookups.
     *
     * @return array<int, array{id: int, action: string, subject: string, at: string, by: string|null, changes: array<int, array{field: string, old: string|null, new: string|null}>}>
     */
    private function buildAuditLog(Member $member): array
    {
        // ─── Collect live entity IDs (for 'updated' log queries) ─────────
        $statusHistoryIds = $member->statusHistory()->pluck('id');
        $aliasIds = $member->aliases()->pluck('id');
        $legacyAchIds = $member->legacyAchievements()->pluck('id');
        $teamMemberIds = TeamMember::where('member_id', $member->id)->pluck('id');

        // One query gives participation IDs + builds both label maps
        $participations = Participation::where('member_id', $member->id)
            ->with(['event:id,name_hi,tournament_id', 'event.tournament:id,name_hi'])
            ->get();
        $participationIds = $participations->pluck('id');
        $achievementIds = $participationIds->isNotEmpty()
            ? Achievement::whereIn('participation_id', $participationIds)->pluck('id')
            : collect();

        // ─── Gather all relevant audit logs ──────────────────────────────

        // Member itself — all actions identified by entity_id
        $logs = AuditLog::where('entity', 'Member')
            ->where('entity_id', $member->id)
            ->get();

        // Entities that store member_id directly in the flat diff
        $directEntities = [
            ['entity' => 'MemberStatusHistory',     'ids' => $statusHistoryIds],
            ['entity' => 'NameAlias',               'ids' => $aliasIds],
            ['entity' => 'TeamMember',              'ids' => $teamMemberIds],
            ['entity' => 'Participation',           'ids' => $participationIds],
            ['entity' => 'MemberLegacyAchievement', 'ids' => $legacyAchIds],
        ];

        foreach ($directEntities as ['entity' => $entity, 'ids' => $ids]) {
            // created/deleted: member_id is a top-level key in the flat diff
            $logs = $logs->merge(
                AuditLog::where('entity', $entity)
                    ->whereIn('action', ['created', 'deleted'])
                    ->whereRaw("JSON_EXTRACT(diff, '$.member_id') = ?", [$member->id])
                    ->get()
            );
            // updated: identified by live entity_id
            if ($ids->isNotEmpty()) {
                $logs = $logs->merge(
                    AuditLog::where('entity', $entity)
                        ->where('action', 'updated')
                        ->whereIn('entity_id', $ids)
                        ->get()
                );
            }
        }

        // Achievement links via participation_id, not member_id — 2-hop query
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

        // ─── Pre-load label maps (one query each, no N+1) ────────────────
        $sportMap = Sport::pluck('name_hi', 'id');
        $unitMap = Unit::pluck('name_hi', 'id');
        $districtMap = District::pluck('name_hi', 'id');
        $userMap = User::pluck('name', 'id');
        $teamMap = Team::pluck('name_hi', 'id');
        $sessionMap = SportSession::pluck('name', 'id');

        // event_id  → "EventName · TournamentName"  (for Participation diff)
        $eventLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->event_id => $p->event->name_hi.' · '.$p->event->tournament?->name_hi,
        ]);
        // participation_id → same label                (for Achievement diff)
        $participationLabelMap = $participations->mapWithKeys(fn (Participation $p) => [
            $p->id => $p->event->name_hi.' · '.$p->event->tournament?->name_hi,
        ]);

        // ─── Subject labels ───────────────────────────────────────────────
        $subjectMap = [
            'Member' => 'Member',
            'MemberStatusHistory' => 'Status',
            'NameAlias' => 'Alias',
            'TeamMember' => 'Team membership',
            'Participation' => 'Tournament participation',
            'Achievement' => 'Achievement',
            'MemberLegacyAchievement' => 'Legacy achievement',
        ];

        // ─── Field label maps (one per entity) ───────────────────────────
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

        // Fields to suppress from flat created/deleted diffs
        $hiddenFields = [
            'Member' => ['id', 'organization_id', 'full_name_normalized', 'source_refs', 'deleted_at'],
            'MemberStatusHistory' => ['id', 'member_id'],
            'NameAlias' => ['id', 'member_id', 'alias_normalized'],
            'TeamMember' => ['id', 'member_id'],
            'Participation' => ['id', 'member_id'],
            'Achievement' => ['id'],
            'MemberLegacyAchievement' => ['id', 'organization_id', 'member_id'],
        ];

        // ─── Value resolver ───────────────────────────────────────────────
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

        // ─── Map each log to the output shape ────────────────────────────
        return $allLogs->map(function (AuditLog $log) use (
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
                // created or deleted — flat attributes stored in diff
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
