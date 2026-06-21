<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreLegacyAchievementRequest;
use App\Http\Requests\Members\UpdateLegacyAchievementRequest;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
use App\Models\SportSession;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class MemberLegacyAchievementController extends Controller
{
    public function store(StoreLegacyAchievementRequest $request, Member $member): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        $payload = $request->validated();
        $payload['session_id'] = $this->resolveSessionId($payload, $member);

        $member->legacyAchievements()->create(array_merge(
            $payload,
            ['organization_id' => $member->organization_id],
        ));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement added.')]);

        return $this->redirectAfterMutation($member);
    }

    public function update(UpdateLegacyAchievementRequest $request, Member $member, MemberLegacyAchievement $legacyAchievement): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        abort_if($legacyAchievement->member_id !== $member->id, 404);

        $payload = $request->validated();
        $sessionBasis = array_merge(
            Arr::only($legacyAchievement->getAttributes(), ['period', 'session_id']),
            ['event_date' => optional($legacyAchievement->event_date)?->toDateString()],
            Arr::only($payload, ['period', 'session_id', 'event_date']),
        );
        $payload['session_id'] = $this->resolveSessionId($sessionBasis, $member);

        $legacyAchievement->update($payload);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement updated.')]);

        return $this->redirectAfterMutation($member);
    }

    public function destroy(Member $member, MemberLegacyAchievement $legacyAchievement): RedirectResponse
    {
        Gate::authorize('manageLegacyAchievements', $member);

        abort_if($legacyAchievement->member_id !== $member->id, 404);

        $legacyAchievement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Legacy achievement removed.')]);

        return $this->redirectAfterMutation($member);
    }

    private function redirectAfterMutation(Member $member): RedirectResponse
    {
        $path = parse_url((string) request()->headers->get('referer', ''), PHP_URL_PATH);

        if (is_string($path) && str_starts_with($path, '/coaches/')) {
            return back();
        }

        return to_route('members.events', $member);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveSessionId(array $payload, Member $member): ?int
    {
        if (($payload['period'] ?? null) !== 'POST_RECRUITMENT') {
            return null;
        }

        if (filled($payload['session_id'] ?? null)) {
            return (int) $payload['session_id'];
        }

        if (! filled($payload['event_date'] ?? null)) {
            return null;
        }

        $year = Carbon::parse((string) $payload['event_date'])->year;

        return SportSession::query()
            ->where('organization_id', $member->organization_id)
            ->where('start_year', '<=', $year)
            ->where('end_year', '>=', $year)
            ->value('id');
    }
}
