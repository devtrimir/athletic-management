<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreAliasRequest;
use App\Models\Member;
use App\Models\NameAlias;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberAliasController extends Controller
{
    public function store(StoreAliasRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageAlias', $member);

        $data = $request->validated();

        NameAlias::create([
            'member_id' => $member->id,
            'alias' => $data['alias'],
            'source' => $data['source'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Alias added.')]);

        return to_route('members.show', $member);
    }

    public function destroy(Member $member, NameAlias $alias): RedirectResponse
    {
        Gate::authorize('manageAlias', $member);

        abort_if($alias->member_id !== $member->id, 404);

        $alias->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Alias removed.')]);

        return to_route('members.show', $member);
    }
}
