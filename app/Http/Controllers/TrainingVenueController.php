<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\TrainingVenues\GetVenueFilterOptions;
use App\Actions\TrainingVenues\GetVenuePrintData;
use App\Actions\TrainingVenues\ListTrainingVenues;
use App\Http\Requests\TrainingVenues\StoreTrainingVenueRequest;
use App\Http\Requests\TrainingVenues\UpdateTrainingVenueRequest;
use App\Models\TrainingVenue;
use App\Support\TrainingVenues\VenueFilters;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TrainingVenueController extends Controller
{
    public function index(Request $request, ListTrainingVenues $list, GetVenueFilterOptions $options): Response
    {
        Gate::authorize('viewAny', TrainingVenue::class);

        $filters = VenueFilters::fromRequest($request);
        $perPage = min(max((int) $request->query('per_page', 25), 10), 100);

        return Inertia::render('training-venues/index', [
            'trainingVenues' => $list($filters, $perPage),
            'filters' => $filters->toArray(),
            ...$options((int) $request->user()->organization_id),
            'perPage' => $perPage,
        ]);
    }

    public function print(Request $request, GetVenuePrintData $printData): Response
    {
        Gate::authorize('viewAny', TrainingVenue::class);

        return Inertia::render('training-venues/print', [
            ...$printData(VenueFilters::fromRequest($request), (int) $request->user()->organization_id),
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
            'statuses' => TrainingVenue::STATUSES,
        ];
    }
}
