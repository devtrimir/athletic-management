<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\ChangeStatusRequest;
use App\Models\Member;
use App\Models\MemberStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberStatusController extends Controller
{
    public function store(ChangeStatusRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('changeStatus', $member);

        $data = $request->validated();

        DB::transaction(function () use ($data, $member, $request): void {
            MemberStatusHistory::create([
                'member_id' => $member->id,
                'status' => $data['status'],
                'effective_on' => $data['effective_on'],
                'reason' => $data['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $member->update(['current_status' => $data['status']]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Status updated.')]);

        return to_route('members.status', $member);
    }
}
