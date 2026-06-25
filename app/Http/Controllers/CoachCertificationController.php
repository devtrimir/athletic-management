<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Coaches\StoreCoachCertificationRequest;
use App\Models\Coach;
use App\Models\CoachCertification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class CoachCertificationController extends Controller
{
    public function store(StoreCoachCertificationRequest $request, Coach $coach): RedirectResponse
    {
        Gate::authorize('updateCertifications', $coach);

        $data = $request->validated();
        $id = isset($data['id']) && is_numeric($data['id']) ? (int) $data['id'] : null;

        $payload = [
            'name' => $data['name'],
            'certificate_type' => $data['certificate_type'] ?? null,
            'issuer' => $data['issuer'] ?? null,
            'issued_at' => $data['issued_at'] ?? null,
            'expired_at' => $data['expired_at'] ?? null,
            'attachment_path' => $data['attachment_path'] ?? null,
        ];

        if ($id !== null) {
            $certification = $coach->certifications()->whereKey($id)->firstOrFail();
            $certification->update($payload);
        } else {
            $coach->certifications()->create($payload);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certification saved.')]);

        return to_route('coaches.certifications', $coach);
    }

    public function destroy(Coach $coach, CoachCertification $certification): RedirectResponse
    {
        Gate::authorize('updateCertifications', $coach);

        abort_if($certification->coach_id !== $coach->id, 404);

        $certification->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certification removed.')]);

        return to_route('coaches.certifications', $coach);
    }
}
