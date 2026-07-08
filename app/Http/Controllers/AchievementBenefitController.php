<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreAchievementBenefitRequest;
use App\Http\Requests\Members\UpdateAchievementBenefitRequest;
use App\Models\Achievement;
use App\Models\AchievementBenefit;
use App\Models\Member;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AchievementBenefitController extends Controller
{
    public function store(StoreAchievementBenefitRequest $request): RedirectResponse
    {
        $data = $request->validated();

        /** @var class-string<Model>|null $modelClass */
        $modelClass = Relation::getMorphedModel($data['benefitable_type']);

        abort_if($modelClass === null, 422, 'Unknown benefitable type.');

        $parent = $modelClass::findOrFail($data['benefitable_id']);

        $member = $this->resolveMember($parent);

        Gate::authorize('manageBenefits', $member);

        AchievementBenefit::create(array_merge($data, [
            'organization_id' => $member->organization_id,
        ]));

        if (
            in_array($data['benefit_type'] ?? '', ['PROMOTION', 'OUT_OF_TURN_PROMOTION'], true)
            && ! empty($data['promoted_to_rank'])
        ) {
            $member->update(['rank' => $data['promoted_to_rank']]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit recorded.')]);

        return $this->redirectAfterMutation($member);
    }

    public function update(UpdateAchievementBenefitRequest $request, AchievementBenefit $benefit): RedirectResponse
    {
        $member = $this->resolveMember($benefit->benefitable);

        Gate::authorize('manageBenefits', $member);

        $benefit->update($request->validated());

        $updated = $request->validated();
        if (
            in_array($updated['benefit_type'] ?? $benefit->benefit_type, ['PROMOTION', 'OUT_OF_TURN_PROMOTION'], true)
            && ! empty($updated['promoted_to_rank'])
        ) {
            $member->update(['rank' => $updated['promoted_to_rank']]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit updated.')]);

        return $this->redirectAfterMutation($member);
    }

    public function destroy(AchievementBenefit $benefit): RedirectResponse
    {
        $member = $this->resolveMember($benefit->benefitable);

        Gate::authorize('manageBenefits', $member);

        $benefit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit removed.')]);

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
     * Resolve the owning Member from any supported benefitable parent.
     *
     * @param  Model  $parent
     */
    private function resolveMember(mixed $parent): Member
    {
        if ($parent instanceof Achievement) {
            return $parent->participation->member;
        }

        abort(422, 'Cannot resolve member from benefitable type.');
    }
}
