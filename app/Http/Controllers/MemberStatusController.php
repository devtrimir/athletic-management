<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Members\ChangeMemberStatus;
use App\Http\Requests\Members\ChangeStatusRequest;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberStatusController extends Controller
{
    public function store(
        ChangeStatusRequest $request,
        Member $member,
        ChangeMemberStatus $action,
    ): RedirectResponse {
        Gate::authorize('changeStatus', $member);

        $data = $request->validated();

        $result = $action(
            member: $member,
            status: $data['status'],
            effectiveOn: $data['effective_on'],
            reason: $data['reason'] ?? null,
            userId: (int) $request->user()->id,
        );

        $message = $result['memberships_closed'] > 0
            ? __('Status updated and :count team membership(s) closed.', ['count' => $result['memberships_closed']])
            : __('Status updated.');

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('members.status', $member);
    }
}
