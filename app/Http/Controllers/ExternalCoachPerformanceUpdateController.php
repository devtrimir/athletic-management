<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalCoachPerformanceUpdates\ReviewExternalCoachPerformanceUpdateRequest;
use App\Models\ExternalCoachPerformanceUpdate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachPerformanceUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoachPerformanceUpdate::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $updates = ExternalCoachPerformanceUpdate::query()
            ->with([
                'member:id,member_code,pno,full_name',
                'externalCoach:id,name,email,phone',
                'sport:id,name',
                'assignment:id,status,start_date,end_date',
                'reviewer:id,name',
            ])
            ->when($filters['review_status'] ?? null, fn ($query, string $status) => $query->where('review_status', $status))
            ->latest('update_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-coach-performance-updates/index', [
            'updates' => $updates,
            'filters' => $filters,
            'reviewStatuses' => ['pending', 'accepted', 'rejected', 'needs_correction', 'locked'],
        ]);
    }

    public function show(ExternalCoachPerformanceUpdate $performanceUpdate): Response
    {
        Gate::authorize('view', $performanceUpdate);

        $performanceUpdate->load([
            'member:id,member_code,pno,full_name',
            'externalCoach:id,name,email,phone',
            'sport:id,name',
            'assignment:id,status,start_date,end_date,training_start_time,training_end_time',
            'reviewer:id,name',
        ]);

        return Inertia::render('external-coach-performance-updates/show', [
            'update' => $performanceUpdate,
            'reviewActions' => ['accept', 'reject', 'needs_correction', 'lock'],
        ]);
    }

    public function review(
        ReviewExternalCoachPerformanceUpdateRequest $request,
        ExternalCoachPerformanceUpdate $performanceUpdate,
    ): RedirectResponse {
        $payload = $request->validated();

        $performanceUpdate->update([
            'review_status' => match ($payload['action']) {
                'accept' => 'accepted',
                'reject' => 'rejected',
                'needs_correction' => 'needs_correction',
                'lock' => 'locked',
            },
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_remarks' => $payload['review_remarks'] ?? null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Performance review saved.')]);

        return to_route('external-coach-performance-updates.show', $performanceUpdate);
    }
}
