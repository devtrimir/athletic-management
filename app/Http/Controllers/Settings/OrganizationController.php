<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateOrganizationRequest;
use App\Models\Organization;
use App\Support\Organisation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function edit(): Response
    {
        $organization = $this->organization();

        Gate::authorize('view', $organization);

        return Inertia::render('settings/organisation/edit', [
            'names' => [
                'display_name_en' => $organization->display_name_en,
                'display_name_hi' => $organization->display_name_hi,
            ],
            'fallback' => __(Organisation::NAME_KEY),
        ]);
    }

    public function update(UpdateOrganizationRequest $request): RedirectResponse
    {
        $organization = $this->organization();

        Gate::authorize('update', $organization);

        $organization->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Organisation name updated.')]);

        return to_route('organisation.edit');
    }

    private function organization(): Organization
    {
        return Organisation::current() ?? abort(404);
    }
}
