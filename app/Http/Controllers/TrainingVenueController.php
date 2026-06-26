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

        $trainingVenues = TrainingVenue::query()
            ->with(['district:id,name', 'unit:id,name'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                $like = '%'.mb_strtolower($term).'%';

                $query->where(function ($builder) use ($like): void {
                    $builder->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('training-venues/index', [
            'trainingVenues' => $trainingVenues,
            'filters' => $filters,
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
}
