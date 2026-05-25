<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Members\StoreAchievementBenefitRequest;
use App\Http\Requests\Members\UpdateAchievementBenefitRequest;
use App\Models\AchievementBenefit;
use App\Models\Member;
use App\Models\MemberLegacyAchievement;
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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit recorded.')]);

        return to_route('members.show', $member);
    }

    public function update(UpdateAchievementBenefitRequest $request, AchievementBenefit $benefit): RedirectResponse
    {
        $member = $this->resolveMember($benefit->benefitable);

        Gate::authorize('manageBenefits', $member);

        $benefit->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit updated.')]);

        return to_route('members.show', $member);
    }

    public function destroy(AchievementBenefit $benefit): RedirectResponse
    {
        $member = $this->resolveMember($benefit->benefitable);

        Gate::authorize('manageBenefits', $member);

        $benefit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Benefit removed.')]);

        return to_route('members.show', $member);
    }

    /**
     * Resolve the owning Member from any supported benefitable parent.
     *
     * @param  Model  $parent
     */
    private function resolveMember(mixed $parent): Member
    {
        if ($parent instanceof MemberLegacyAchievement) {
            return $parent->member;
        }

        abort(422, 'Cannot resolve member from benefitable type.');
    }
}
