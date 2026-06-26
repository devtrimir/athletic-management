<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ExternalCoachPerformanceUpdates\ReviewExternalCoachPerformanceUpdateRequest;
use App\Models\ExternalCoachPerformanceUpdate;
use App\Models\Sport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachPerformanceUpdateController extends Controller
{
    /** @var array<int, string> */
    private const array REVIEW_STATUSES = ['pending', 'accepted', 'rejected', 'needs_correction', 'locked'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ExternalCoachPerformanceUpdate::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $memberQuery = $this->filterString($filters['member_query'] ?? $filters['member'] ?? null);
        $coachQuery = $this->filterString($filters['coach_query'] ?? $filters['coach'] ?? null);
        $sportId = $this->filterInt($filters['sport_id'] ?? null);
        $reviewStatus = $this->filterString($filters['review_status'] ?? null);
        $dateFrom = $this->filterDate($filters['date_from'] ?? $filters['update_date_from'] ?? null);
        $dateTo = $this->filterDate($filters['date_to'] ?? $filters['update_date_to'] ?? null);

        $updates = ExternalCoachPerformanceUpdate::query()
            ->with([
                'member:id,member_code,pno,full_name',
                'externalCoach:id,name,email,phone',
                'sport:id,name',
                'assignment:id,status,start_date,end_date',
                'reviewer:id,name',
            ])
            ->when(
                $memberQuery !== null,
                function ($query) use ($memberQuery): void {
                    $query->whereHas('member', function ($memberQueryBuilder) use ($memberQuery): void {
                        $memberQueryBuilder
                            ->where('full_name', 'like', "%{$memberQuery}%")
                            ->orWhere('member_code', 'like', "%{$memberQuery}%")
                            ->orWhere('pno', 'like', "%{$memberQuery}%");
                    });
                },
            )
            ->when(
                $coachQuery !== null,
                function ($query) use ($coachQuery): void {
                    $query->whereHas('externalCoach', function ($coachQueryBuilder) use ($coachQuery): void {
                        $coachQueryBuilder
                            ->where('name', 'like', "%{$coachQuery}%")
                            ->orWhere('phone', 'like', "%{$coachQuery}%")
                            ->orWhere('email', 'like', "%{$coachQuery}%");
                    });
                },
            )
            ->when($sportId !== null, fn ($query) => $query->where('sport_id', $sportId))
            ->when($dateFrom !== null || $dateTo !== null, function ($query) use ($dateFrom, $dateTo): void {
                if ($dateFrom !== null) {
                    $query->whereDate('update_date', '>=', $dateFrom);
                }

                if ($dateTo !== null) {
                    $query->whereDate('update_date', '<=', $dateTo);
                }
            })
            ->when($reviewStatus !== null, fn ($query) => $query->where('review_status', $reviewStatus))
            ->latest('update_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('external-coach-performance-updates/index', [
            'updates' => $updates,
            'filters' => [
                'member_query' => $memberQuery,
                'coach_query' => $coachQuery,
                'sport_id' => $sportId !== null ? (string) $sportId : null,
                'review_status' => $reviewStatus,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'sports' => Sport::query()
                ->where('organization_id', (int) $request->user()->organization_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'reviewStatuses' => $this->reviewStatuses((int) $request->user()->organization_id),
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

    private function filterDate(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        return $value;
    }

    private function filterInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        if (! ctype_digit($value)) {
            return null;
        }

        $intValue = (int) $value;

        return $intValue > 0 ? $intValue : null;
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * @return list<string>
     */
    private function reviewStatuses(int $organizationId): array
    {
        $values = ExternalCoachPerformanceUpdate::query()
            ->where('organization_id', $organizationId)
            ->whereNotNull('review_status')
            ->select('review_status')
            ->distinct()
            ->pluck('review_status')
            ->filter()
            ->map(static fn (string $status): string => $status)
            ->values()
            ->toArray();

        if ($values === []) {
            return self::REVIEW_STATUSES;
        }

        $ordered = array_values(array_intersect(self::REVIEW_STATUSES, $values));
        $additional = array_values(array_filter($values, static fn (string $status): bool => ! in_array($status, self::REVIEW_STATUSES, true)));

        return array_values(array_unique(array_merge($ordered, $additional)));
    }
}
