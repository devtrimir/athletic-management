<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TrainingVenues\StoreTrainingVenueRequest;
use App\Http\Requests\TrainingVenues\UpdateTrainingVenueRequest;
use App\Models\ExternalCoach;
use App\Models\Sport;
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

        ['status' => $statusFilter, 'q' => $search, 'extra' => $extra] = $this->listingFilters($request);
        $perPage = min(max((int) $request->query('per_page', 25), 10), 100);

        $trainingVenues = TrainingVenue::query()
            ->filter($statusFilter, $search, $extra)
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('training-venues/index', [
            'trainingVenues' => $trainingVenues,
            'filters' => [
                'q' => $search,
                'status' => $statusFilter,
                'city' => $extra['city'],
                'state' => $extra['state'],
                'coach_id' => $extra['coach_id'] === null ? null : (string) $extra['coach_id'],
                'sport_id' => $extra['sport_id'] === null ? null : (string) $extra['sport_id'],
            ],
            'statuses' => ['active', 'inactive', 'under_review'],
            'cities' => TrainingVenue::query()->whereNotNull('city')->where('city', '!=', '')->distinct()->orderBy('city')->pluck('city'),
            'states' => TrainingVenue::query()->whereNotNull('state')->where('state', '!=', '')->distinct()->orderBy('state')->pluck('state'),
            'coaches' => ExternalCoach::query()->where('organization_id', (int) $request->user()->organization_id)->whereHas('trainingVenues')->orderBy('name')->get(['id', 'name']),
            'sports' => Sport::query()->where('organization_id', (int) $request->user()->organization_id)->whereHas('externalCoaches.trainingVenues')->orderBy('name')->get(['id', 'name']),
            'perPage' => $perPage,
        ]);
    }

    public function print(Request $request): Response
    {
        Gate::authorize('viewAny', TrainingVenue::class);

        ['status' => $statusFilter, 'q' => $search, 'extra' => $extra] = $this->listingFilters($request);
        $orgId = (int) $request->user()->organization_id;

        return Inertia::render('training-venues/print', [
            'venues' => TrainingVenue::query()
                ->filter($statusFilter, $search, $extra)
                ->orderBy('name')
                ->limit(2000)
                ->get()
                ->map(fn (TrainingVenue $venue): array => [
                    'id' => $venue->id,
                    'name' => $venue->name,
                    'code' => $venue->code,
                    'city' => $venue->city,
                    'allowed_radius_meters' => $venue->allowed_radius_meters,
                    'status' => $venue->status,
                ]),
            'filters' => [
                'q' => $search,
                'status' => $statusFilter,
                'city' => $extra['city'],
                'state' => $extra['state'],
                'coach' => $extra['coach_id'] === null ? null : ExternalCoach::query()->where('organization_id', $orgId)->whereKey($extra['coach_id'])->value('name'),
                'sport' => $extra['sport_id'] === null ? null : Sport::query()->where('organization_id', $orgId)->whereKey($extra['sport_id'])->value('name'),
            ],
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

    /**
     * @return array{status: ?string, q: ?string, extra: array{city: ?string, state: ?string, coach_id: ?int, sport_id: ?int}}
     */
    private function listingFilters(Request $request): array
    {
        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];
        $id = static fn (mixed $value): ?int => is_string($value) && ctype_digit($value) && (int) $value > 0 ? (int) $value : null;

        return [
            'status' => $this->filterString($filters['status'] ?? null),
            'q' => $this->filterString($filters['q'] ?? null),
            'extra' => [
                'city' => $this->filterString($filters['city'] ?? null),
                'state' => $this->filterString($filters['state'] ?? null),
                'coach_id' => $id($filters['coach_id'] ?? null),
                'sport_id' => $id($filters['sport_id'] ?? null),
            ],
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
