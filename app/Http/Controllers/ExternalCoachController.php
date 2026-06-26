<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalCoaches\StoreExternalCoachRequest;
use App\Http\Requests\ExternalCoaches\UpdateExternalCoachRequest;
use App\Models\ExternalCoach;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoach::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $orgId = (int) $request->user()->organization_id;

        $externalCoaches = ExternalCoach::query()
            ->where('organization_id', $orgId)
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                $like = '%'.mb_strtolower($term).'%';

                $query->where(function ($builder) use ($like): void {
                    $builder->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$like]);
                });
            })
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-coaches/index', [
            'externalCoaches' => $externalCoaches,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', ExternalCoach::class);

        return Inertia::render('external-coaches/create', [
            'statuses' => $this->statuses(),
        ]);
    }

    public function store(StoreExternalCoachRequest $request): RedirectResponse
    {
        Gate::authorize('create', ExternalCoach::class);

        $payload = $request->validated();
        $statusReason = Arr::pull($payload, 'status_reason');

        $externalCoach = ExternalCoach::create([
            ...$payload,
            'organization_id' => (int) $request->user()->organization_id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->recordStatus($externalCoach, $externalCoach->status, $request->user()->id, $statusReason);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach created.')]);

        return to_route('external-coaches.show', $externalCoach);
    }

    public function show(ExternalCoach $externalCoach): Response
    {
        Gate::authorize('view', $externalCoach);

        return Inertia::render('external-coaches/show', [
            'externalCoach' => $externalCoach->load(['district:id,name', 'statusHistory.recordedBy:id,name']),
        ]);
    }

    public function edit(ExternalCoach $externalCoach): Response
    {
        Gate::authorize('update', $externalCoach);

        return Inertia::render('external-coaches/edit', [
            'externalCoach' => $externalCoach,
            'statuses' => $this->statuses(),
        ]);
    }

    public function update(UpdateExternalCoachRequest $request, ExternalCoach $externalCoach): RedirectResponse
    {
        Gate::authorize('update', $externalCoach);

        $payload = $request->validated();
        $statusReason = Arr::pull($payload, 'status_reason');
        $oldStatus = $externalCoach->status;

        if (($payload['password'] ?? null) === null) {
            unset($payload['password']);
        }

        if ($oldStatus !== $payload['status']) {
            Gate::authorize('manageStatus', $externalCoach);
        }

        $externalCoach->update([
            ...$payload,
            'updated_by' => $request->user()->id,
        ]);

        if ($oldStatus !== $externalCoach->status) {
            $this->recordStatus($externalCoach, $externalCoach->status, $request->user()->id, $statusReason);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach updated.')]);

        return to_route('external-coaches.show', $externalCoach);
    }

    public function destroy(ExternalCoach $externalCoach): RedirectResponse
    {
        Gate::authorize('delete', $externalCoach);

        $externalCoach->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('External coach deleted.')]);

        return to_route('external-coaches.index');
    }

    /**
     * @return list<string>
     */
    private function statuses(): array
    {
        return ['pending_invite', 'active', 'inactive', 'suspended', 'blacklisted'];
    }

    private function recordStatus(ExternalCoach $externalCoach, string $status, ?int $recordedBy, ?string $reason): void
    {
        $externalCoach->statusHistory()->create([
            'status' => $status,
            'reason' => $reason,
            'recorded_by' => $recordedBy,
            'recorded_at' => now(),
        ]);
    }
}
