<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Actions\Points\CreatePointSchemeDraft;
use App\Actions\Points\PublishPointScheme;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdatePointSchemeRequest;
use App\Models\GameLevel;
use App\Models\ParticipationScore;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Versions of the points table. A version is edited as a draft, published from a
 * start date, and then locked: results already scored keep the version they used.
 */
class PointSchemeController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', PointScheme::class);

        $used = ParticipationScore::selectRaw('point_scheme_id, count(*) as total')->groupBy('point_scheme_id')->pluck('total', 'point_scheme_id');

        return Inertia::render('settings/point-schemes/index', [
            'schemes' => PointScheme::orderByDesc('version_number')->get()
                ->map(fn (PointScheme $scheme): array => [
                    'id' => $scheme->id,
                    'version_number' => $scheme->version_number,
                    'name' => $scheme->name,
                    'status' => $scheme->status,
                    'effective_from' => $scheme->effective_from?->toDateString(),
                    'published_at' => $scheme->published_at?->toDateString(),
                    'results_scored' => (int) ($used[$scheme->id] ?? 0),
                ]),
        ]);
    }

    public function store(Request $request, CreatePointSchemeDraft $createDraft): RedirectResponse
    {
        Gate::authorize('create', PointScheme::class);

        $data = $request->validate(['source_id' => ['nullable', 'integer'], 'name' => ['nullable', 'string', 'max:255']]);
        $source = isset($data['source_id']) ? PointScheme::findOrFail($data['source_id']) : PointScheme::orderByDesc('version_number')->first();
        $draft = $createDraft($request->user(), $source, $data['name'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft version created.')]);

        return to_route('point-schemes.show', $draft);
    }

    public function show(PointScheme $pointScheme): Response
    {
        Gate::authorize('viewAny', PointScheme::class);

        $points = [];

        foreach (PointSchemeRow::where('point_scheme_id', $pointScheme->id)->get() as $row) {
            $points[$row->game_level_id][$row->result] = $row->points;
        }

        return Inertia::render('settings/point-schemes/show', [
            'scheme' => [
                'id' => $pointScheme->id,
                'version_number' => $pointScheme->version_number,
                'name' => $pointScheme->name,
                'notes' => $pointScheme->notes,
                'status' => $pointScheme->status,
                'effective_from' => $pointScheme->effective_from?->toDateString(),
                'published_at' => $pointScheme->published_at?->toDateString(),
                'results_scored' => ParticipationScore::where('point_scheme_id', $pointScheme->id)->count(),
            ],
            'levels' => GameLevel::orderBy('sort_order')->orderBy('id')->get(['id', 'name_en', 'name_hi', 'is_active']),
            'points' => (object) $points,
            'results' => PointScheme::RESULTS,
            'canEdit' => Gate::allows('update', $pointScheme),
        ]);
    }

    public function update(UpdatePointSchemeRequest $request, PointScheme $pointScheme, PublishPointScheme $publish): RedirectResponse
    {
        $data = $request->validated();
        $publishing = $request->boolean('publish');

        if ($publishing) {
            Validator::make($data, $request->publishRules())->validate();
        }

        $pointScheme->update(['name' => $data['name'], 'notes' => $data['notes'] ?? null, 'effective_from' => $data['effective_from'] ?? null]);

        foreach ($data['points'] as $levelId => $results) {
            foreach ($results as $result => $points) {
                PointSchemeRow::updateOrCreate(
                    ['point_scheme_id' => $pointScheme->id, 'game_level_id' => (int) $levelId, 'result' => $result],
                    ['points' => (int) $points],
                );
            }
        }

        if ($publishing) {
            $publish($pointScheme, (string) $data['effective_from']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $publishing ? __('Version published.') : __('Draft saved.')]);

        return to_route('point-schemes.show', $pointScheme);
    }

    public function destroy(PointScheme $pointScheme): RedirectResponse
    {
        Gate::authorize('delete', $pointScheme);

        $pointScheme->rows()->delete();
        $pointScheme->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft deleted.')]);

        return to_route('point-schemes.index');
    }
}
