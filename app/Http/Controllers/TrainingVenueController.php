<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TrainingVenues\StoreTrainingVenueRequest;
use App\Http\Requests\TrainingVenues\UpdateTrainingVenueRequest;
use App\Models\TrainingVenue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TrainingVenueController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', TrainingVenue::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusFilter = $this->filterString($filters['status'] ?? null);
        $search = $this->filterString($filters['q'] ?? null);
        $perPage = min(max((int) $request->query('per_page', 25), 10), 100);

        $trainingVenues = TrainingVenue::query()
            ->with(['district:id,name', 'unit:id,name'])
            ->filter($statusFilter, $search)
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('training-venues/index', [
            'trainingVenues' => $trainingVenues,
            'filters' => [
                'q' => $search,
                'status' => $statusFilter,
            ],
            'statuses' => ['active', 'inactive', 'under_review'],
            'perPage' => $perPage,
        ]);
    }

    public function print(Request $request): Response
    {
        Gate::authorize('viewAny', TrainingVenue::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $statusFilter = $this->filterString($filters['status'] ?? null);
        $search = $this->filterString($filters['q'] ?? null);

        return Inertia::render('training-venues/print', [
            'venues' => TrainingVenue::query()
                ->with(['district:id,name', 'unit:id,name'])
                ->filter($statusFilter, $search)
                ->orderBy('name')
                ->limit(2000)
                ->get()
                ->map(fn (TrainingVenue $venue): array => [
                    'id' => $venue->id,
                    'name' => $venue->name,
                    'code' => $venue->code,
                    'city' => $venue->city,
                    'district' => $venue->district?->name,
                    'unit' => $venue->unit?->name,
                    'allowed_radius_meters' => $venue->allowed_radius_meters,
                    'status' => $venue->status,
                ]),
            'filters' => ['q' => $search, 'status' => $statusFilter],
            'printedAt' => now()->timezone('Asia/Kolkata')->format('d M Y, h:i A').' IST',
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', TrainingVenue::class);

        return Inertia::render('training-venues/create', $this->formOptions());
    }

    public function store(StoreTrainingVenueRequest $request): RedirectResponse
    {
        Gate::authorize('create', TrainingVenue::class);

        $trainingVenue = TrainingVenue::create([
            ...$request->validated(),
            'organization_id' => (int) $request->user()->organization_id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Training venue created.')]);

        return to_route('training-venues.show', $trainingVenue);
    }

    public function show(TrainingVenue $trainingVenue): Response
    {
        Gate::authorize('view', $trainingVenue);

        return Inertia::render('training-venues/show', [
            'trainingVenue' => $trainingVenue->load(['district:id,name', 'unit:id,name']),
        ]);
    }

    public function edit(Request $request, TrainingVenue $trainingVenue): Response
    {
        Gate::authorize('update', $trainingVenue);

        return Inertia::render('training-venues/edit', [
            'trainingVenue' => $trainingVenue,
            ...$this->formOptions(),
        ]);
    }

    public function update(UpdateTrainingVenueRequest $request, TrainingVenue $trainingVenue): RedirectResponse
    {
        Gate::authorize('update', $trainingVenue);

        $trainingVenue->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Training venue updated.')]);

        return to_route('training-venues.show', $trainingVenue);
    }

    public function destroy(TrainingVenue $trainingVenue): RedirectResponse
    {
        Gate::authorize('delete', $trainingVenue);

        $trainingVenue->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Training venue deleted.')]);

        return to_route('training-venues.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'statuses' => ['active', 'inactive', 'under_review'],
        ];
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' || $value === 'all' ? null : $value;
    }
}
