<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Models\District;
use App\Models\Member;
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
                AllowedFilter::partial('q', 'full_name_hi'),
            ])
            ->allowedSorts(['full_name_hi', 'pno', 'joining_date', 'created_at'])
            ->defaultSort('-created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('members/index', [
            'members' => $members,
            'filters' => $request->query('filter', []),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Member::class);

        return Inertia::render('members/create', [
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
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
            'member' => $member->load(['homeDistrict', 'currentUnit']),
        ]);
    }

    public function edit(Member $member): Response
    {
        Gate::authorize('update', $member);

        return Inertia::render('members/edit', [
            'member' => $member,
            'districts' => District::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
            'units' => Unit::orderBy('name_en')->get(['id', 'name_hi', 'name_en']),
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
