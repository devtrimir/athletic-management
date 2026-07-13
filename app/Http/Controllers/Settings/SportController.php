<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreSportRequest;
use App\Http\Requests\Settings\UpdateSportRequest;
use App\Models\Sport;
use App\Models\SportEvent;
use App\Models\SportEventVariant;
use App\Models\WeightCategory;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SportController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Sport::class);

        $sports = Sport::where('organization_id', $request->user()->organization_id)
            ->withCount(['sportEvents', 'eventVariants'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/sports/index', [
            'sports' => $sports->map(fn (Sport $sport): array => $this->sportIndexData($sport))->values(),
        ]);
    }

    public function show(Request $request, Sport $sport): Response
    {
        Gate::authorize('view', $sport);

        $sport->load([
            'sportEvents' => fn ($query) => $query
                ->with([
                    'variants' => fn ($query) => $query
                        ->with([
                            'participationFormat',
                            'genderCategory',
                            'ageCategory',
                            'weightCategory',
                            'measurementUnit',
                            'resultType',
                        ])
                        ->orderBy('sort_order')
                        ->orderBy('name'),
                ])
                ->orderBy('sort_order')
                ->orderBy('name'),
            'weightCategories' => fn ($query) => $query
                ->with('genderCategory')
                ->orderBy('sort_order')
                ->orderBy('name'),
        ])->loadCount(['sportEvents', 'eventVariants', 'weightCategories']);

        $sports = Sport::where('organization_id', $request->user()->organization_id)
            ->withCount(['sportEvents', 'eventVariants'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Sport $sport): array => $this->sportSwitcherData($sport))
            ->values();

        $eventDirectory = SportEvent::query()
            ->whereHas('sport', function ($query) use ($request): void {
                $query->where('organization_id', $request->user()->organization_id);
            })
            ->with('sport:id,name,code')
            ->withCount([
                'variants as team_variant_count' => fn ($query): mixed => $query
                    ->where('is_team_based', true),
                'variants as individual_variant_count' => fn ($query): mixed => $query
                    ->where('is_team_based', false),
            ])
            ->orderBy('name')
            ->orderBy('code')
            ->get(['id', 'sport_id', 'name', 'code']);

        return Inertia::render('settings/sports/show', [
            'sport' => $this->sportShowData($sport),
            'sports' => $sports,
            'event_directory' => $eventDirectory
                ->map(fn (SportEvent $event): array => [
                    'id' => $event->id,
                    'name' => $event->name,
                    'code' => $event->code,
                    'sport_id' => $event->sport_id,
                    'sport_name' => $event->sport?->name,
                    'sport_code' => $event->sport?->code,
                    'team_variant_count' => (int) $event->team_variant_count,
                    'individual_variant_count' => (int) $event->individual_variant_count,
                ])
                ->values(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Sport::class);

        return Inertia::render('settings/sports/create');
    }

    public function store(StoreSportRequest $request): RedirectResponse
    {
        Gate::authorize('create', Sport::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        Sport::create(array_merge($data, [
            'organization_id' => $orgId,
            'slug' => $this->slugForName($data['name']),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport created.')]);

        return to_route('sports.index');
    }

    public function edit(Sport $sport): Response
    {
        Gate::authorize('update', $sport);

        return Inertia::render('settings/sports/edit', [
            'sport' => $sport,
        ]);
    }

    public function update(UpdateSportRequest $request, Sport $sport): RedirectResponse
    {
        Gate::authorize('update', $sport);

        $data = $request->validated();

        $sport->update(array_merge($data, [
            'slug' => $this->slugForName($data['name']),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport updated.')]);

        return to_route('sports.index');
    }

    public function destroy(Sport $sport): RedirectResponse
    {
        Gate::authorize('delete', $sport);

        $sport->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sport deleted.')]);

        return to_route('sports.index');
    }

    private function slugForName(string $name): string
    {
        $slug = Str::slug($name);

        return $slug !== '' ? $slug : 'sport-'.substr(sha1($name), 0, 10);
    }

    /**
     * @return array{id: int, name: string, name_en: string|null, code: string|null, category: string, slug: string, description: string|null, is_active: bool, sort_order: int, sport_events_count: int, event_variants_count: int}
     */
    private function sportIndexData(Sport $sport): array
    {
        return [
            'id' => $sport->id,
            'name' => $sport->name,
            'name_en' => $sport->name_en,
            'code' => $sport->code,
            'category' => $sport->category,
            'slug' => $sport->slug,
            'description' => $sport->description,
            'is_active' => $sport->is_active,
            'sort_order' => $sport->sort_order,
            'sport_events_count' => (int) ($sport->sport_events_count ?? 0),
            'event_variants_count' => (int) ($sport->event_variants_count ?? 0),
        ];
    }

    /**
     * @return array{id: int, name: string, name_en: string|null, code: string|null, category: string, sport_events_count: int, event_variants_count: int}
     */
    private function sportSwitcherData(Sport $sport): array
    {
        return [
            'id' => $sport->id,
            'name' => $sport->name,
            'name_en' => $sport->name_en,
            'code' => $sport->code,
            'category' => $sport->category,
            'sport_events_count' => (int) ($sport->sport_events_count ?? 0),
            'event_variants_count' => (int) ($sport->event_variants_count ?? 0),
        ];
    }

    /**
     * @return array{id: int, name: string, code: string|null, category: string, slug: string, description: string|null, is_active: bool, sort_order: int, sport_events_count: int, event_variants_count: int, weight_categories_count: int, events: list<array<string, mixed>>, weight_categories: list<array<string, mixed>>}
     */
    private function sportShowData(Sport $sport): array
    {
        return [
            ...$this->sportIndexData($sport),
            'weight_categories_count' => (int) ($sport->weight_categories_count ?? 0),
            'events' => $this->sportEventsData($sport->sportEvents),
            'weight_categories' => $this->weightCategoriesData($sport->weightCategories),
        ];
    }

    /**
     * @param  EloquentCollection<int, SportEvent>  $events
     * @return list<array{id: int, name: string, code: string, discipline_type: string|null, is_active: bool, variants_count: int, variants: list<array<string, mixed>>}>
     */
    private function sportEventsData(EloquentCollection $events): array
    {
        return $events
            ->map(fn (SportEvent $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'code' => $event->code,
                'discipline_type' => $event->discipline_type,
                'is_active' => $event->is_active,
                'variants_count' => $event->variants->count(),
                'variants' => $event->variants
                    ->map(fn (SportEventVariant $variant): array => $this->variantData($variant))
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function variantData(SportEventVariant $variant): array
    {
        return [
            'id' => $variant->id,
            'name' => $variant->name,
            'code' => $variant->code,
            'participation_format' => $variant->participationFormat?->name,
            'gender_category' => $variant->genderCategory?->name,
            'age_category' => $variant->ageCategory?->name,
            'weight_category' => $variant->weightCategory?->name,
            'measurement_unit' => $variant->measurementUnit?->name,
            'measurement_symbol' => $variant->measurementUnit?->symbol,
            'result_type' => $variant->resultType?->name,
            'min_participants' => $variant->min_participants,
            'max_participants' => $variant->max_participants,
            'min_male_participants' => $variant->min_male_participants,
            'max_male_participants' => $variant->max_male_participants,
            'min_female_participants' => $variant->min_female_participants,
            'max_female_participants' => $variant->max_female_participants,
            'substitute_allowed' => $variant->substitute_allowed,
            'substitute_limit' => $variant->substitute_limit,
            'is_team_based' => $variant->is_team_based,
            'is_medal_event' => $variant->is_medal_event,
            'is_active' => $variant->is_active,
        ];
    }

    /**
     * @param  EloquentCollection<int, WeightCategory>  $weightCategories
     * @return list<array{id: int, name: string, code: string, gender_category: string|null, min_weight: string|null, max_weight: string|null, is_active: bool}>
     */
    private function weightCategoriesData(EloquentCollection $weightCategories): array
    {
        return $weightCategories
            ->map(fn (WeightCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'code' => $category->code,
                'gender_category' => $category->genderCategory?->name,
                'min_weight' => $category->min_weight,
                'max_weight' => $category->max_weight,
                'is_active' => $category->is_active,
            ])
            ->values()
            ->all();
    }
}
