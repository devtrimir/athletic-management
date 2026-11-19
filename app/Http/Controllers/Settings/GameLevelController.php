<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\SaveGameLevelRequest;
use App\Models\Competition;
use App\Models\GameLevel;
use App\Models\PointSchemeRow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Game levels and the competitions inside them. Points live in versioned
 * point schemes, so nothing here changes a result that was already scored.
 */
class GameLevelController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', GameLevel::class);

        return Inertia::render('settings/game-levels/index', [
            'levels' => GameLevel::orderBy('sort_order')->orderBy('id')
                ->with(['competitions' => fn ($competitions) => $competitions->orderBy('sort_order')->orderBy('id')->withCount('tournaments')])
                ->get(),
        ]);
    }

    public function store(SaveGameLevelRequest $request): RedirectResponse
    {
        $orgId = (int) $request->user()->organization_id;
        $base = Str::upper(Str::slug($request->string('name_en')->toString(), '_')) ?: 'LEVEL';
        $code = $base;

        for ($suffix = 2; GameLevel::where('code', $code)->exists(); $suffix++) {
            $code = $base.'_'.$suffix;
        }

        GameLevel::create($request->validated() + ['organization_id' => $orgId, 'code' => $code, 'is_active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Game level created.')]);

        return to_route('game-levels.index');
    }

    public function update(SaveGameLevelRequest $request, GameLevel $gameLevel): RedirectResponse
    {
        $gameLevel->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Game level updated.')]);

        return to_route('game-levels.index');
    }

    public function destroy(GameLevel $gameLevel): RedirectResponse
    {
        Gate::authorize('delete', $gameLevel);

        if (Competition::where('game_level_id', $gameLevel->id)->exists() || PointSchemeRow::where('game_level_id', $gameLevel->id)->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('This level is used by competitions or points versions. Deactivate it instead.')]);

            return to_route('game-levels.index');
        }

        $gameLevel->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Game level deleted.')]);

        return to_route('game-levels.index');
    }
}
