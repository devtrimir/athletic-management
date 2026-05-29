<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Http\Resources\MemberStatusHistoryResource;
use App\Http\Resources\NameAliasResource;
use App\Models\District;
use App\Models\Member;
use App\Models\Sport;
use App\Models\TeamMember;
use App\Models\Unit;
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
}
