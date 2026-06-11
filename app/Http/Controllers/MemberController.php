<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Http\Resources\MemberStatusHistoryResource;
use App\Http\Resources\NameAliasResource;
use App\Models\AuditLog;
use App\Models\Designation;
use App\Models\District;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Rank;
use App\Models\Sport;
use App\Models\TeamMember;
use App\Models\Unit;
use App\Services\AuditLogBuilder;
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

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $query = Member::query()
            ->when(
                ! array_key_exists('current_status', $filters),
                fn ($query) => $query->where('current_status', 'ACTIVE')
            );

        $members = QueryBuilder::for($query)
            ->allowedFilters([
                AllowedFilter::callback('player_category', function ($query, string $value): void {
                    $value === 'SPORTS_QUOTA'
                        ? $query->whereIn('player_category', ['SPORTS_QUOTA', 'SKILLED'])
                        : $query->where('player_category', $value);
                }),
                AllowedFilter::exact('player_level'),
                AllowedFilter::exact('current_status'),
                AllowedFilter::exact('home_district_id'),
                AllowedFilter::exact('posting_district_id'),
                AllowedFilter::exact('current_unit_id'),
                AllowedFilter::exact('pno'),
                AllowedFilter::exact('rank'),
                AllowedFilter::exact('designation'),
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
            ->with([
                'currentUnit:id,name_hi,name_en',
                'homeDistrict:id,name_hi,name_en',
                'postingDistrict:id,name_hi,name_en',
                'sport:id,name_hi,name_en',
                'playableSports:id,name_hi,name_en',
            ])
            ->paginate(min((int) ($request->query('per_page', 25)), 100))
            ->withQueryString();

        return Inertia::render('members/index', [
            'members' => $members,
            'filters' => ['current_status' => 'ACTIVE', ...$filters],
            'perPage' => min((int) ($request->query('per_page', 25)), 100),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'sports' => Sport::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'ranks' => Rank::active()->ordered()->get(['code', 'name_hi', 'name_en', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name_hi,name_en,short_name')->get(['code', 'name_hi', 'name_en', 'short_name', 'mapped_rank_code']),
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
            'ranks' => Rank::active()->ordered()->get(['code', 'name_en', 'name_hi', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name_en,name_hi,short_name')->get(['code', 'name_en', 'name_hi', 'short_name', 'mapped_rank_code']),
        ]);
    }

    public function store(StoreMemberRequest $request, MemberCodeGenerator $generator): RedirectResponse
    {
        Gate::authorize('create', Member::class);

        $orgId = (int) $request->user()->organization_id;
        $data = $request->validated();
        $beforePlayableSportIds = [];
        $playableSportIds = $this->playableSportIds($data);
        unset($data['playable_sport_ids']);

        $member = Member::create(array_merge($data, [
            'organization_id' => $orgId,
            'member_code' => $generator->next($orgId),
        ]));

        $member->playableSports()->sync($playableSportIds);
        $this->logPlayableSportChanges($member, $beforePlayableSportIds, $playableSportIds);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member created.')]);

        return to_route('members.show', $member);
    }

    public function show(Member $member, AuditLogBuilder $auditLogBuilder): Response
    {
        Gate::authorize('view', $member);

        return Inertia::render('members/show', [
            'member' => (new MemberResource($member->load(['homeDistrict', 'postingDistrict', 'currentUnit', 'sport', 'playableSports'])))->resolve(),
            'statusHistory' => Inertia::defer(fn () => MemberStatusHistoryResource::collection(
                $member->statusHistory()->with('recorder')->get()
            )->resolve()),
            'aliases' => Inertia::defer(fn () => NameAliasResource::collection(
                $member->aliases()->get()
            )->resolve()),
            'memberTeams' => Inertia::defer(fn () => TeamMember::where('member_id', $member->id)
                ->with(['team:id,name_hi,sport_id', 'team.sport:id,name_hi,name_en', 'session:id,name'])
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
                    'cash_reward_amount' => $promotion->cash_reward_amount,
                    'cash_reward_date' => $promotion->cash_reward_date?->toDateString(),
                    'cash_reward_reference' => $promotion->cash_reward_reference,
                    'cash_reward_remarks' => $promotion->cash_reward_remarks,
                    'reason' => $promotion->reason,
                    'remarks' => $promotion->remarks,
                    'recorded_by_name' => $promotion->recorder?->name,
                    'evidences' => $promotion->evidences->map(fn ($evidence) => [
                        'id' => $evidence->id,
                        'type' => $evidence->evidencable_type,
                        'evidence_id' => $evidence->evidencable_id,
                    ])->all(),
                ])->all()),
            'ranks' => Rank::active()->ordered()->get(['code', 'name_hi', 'name_en', 'short_name']),
            'auditLog' => Inertia::defer(fn () => $auditLogBuilder->forMember($member)),
        ]);
    }

    public function edit(Member $member): Response
    {
        Gate::authorize('update', $member);

        return Inertia::render('members/edit', [
            'member' => $member->load(['sport', 'playableSports:id,name_hi,name_en']),
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'sports' => Sport::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'ranks' => Rank::active()->ordered()->get(['code', 'name_en', 'name_hi', 'short_name']),
            'designations' => Designation::active()->ordered()->with('rank:code,name_en,name_hi,short_name')->get(['code', 'name_en', 'name_hi', 'short_name', 'mapped_rank_code']),
        ]);
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('update', $member);

        $data = $request->validated();
        $beforePlayableSportIds = $member->playableSports()->pluck('sports.id')->all();
        $playableSportIds = $this->playableSportIds($data);
        $shouldSyncPlayableSports = array_key_exists('playable_sport_ids', $data);
        unset($data['playable_sport_ids']);

        $member->update($data);

        if ($shouldSyncPlayableSports) {
            $member->playableSports()->sync($playableSportIds);
            $this->logPlayableSportChanges($member, $beforePlayableSportIds, $playableSportIds);
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
     * @return array<int, int>
     */
    private function playableSportIds(array $data): array
    {
        $primarySportId = isset($data['sport_id']) ? (int) $data['sport_id'] : null;

        return collect($data['playable_sport_ids'] ?? [])
            ->map(fn (mixed $sportId): int => (int) $sportId)
            ->unique()
            ->reject(fn (int $sportId): bool => $sportId === $primarySportId)
            ->values()
            ->all();
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
}
