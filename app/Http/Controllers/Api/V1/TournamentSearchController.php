<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'session_ids' => ['nullable', 'array'],
            'session_ids.*' => ['integer', 'exists:sport_sessions,id'],
            'year_from' => ['nullable', 'integer', 'min:1900', 'max:2099'],
            'year_to' => ['nullable', 'integer', 'min:1900', 'max:2099'],
        ]);

        $sessionIds = array_map('intval', $validated['session_ids'] ?? []);
        $yearFrom = $validated['year_from'] ?? null;
        $yearTo = $validated['year_to'] ?? null;

        if ($sessionIds === [] && $yearFrom === null && $yearTo === null) {
            return response()->json(['data' => []]);
        }

        $search = trim((string) ($validated['q'] ?? ''));
        $tournaments = Tournament::query()
            ->where('organization_id', (int) $request->user()->organization_id)
            ->whereNull('deleted_at')
            ->when($sessionIds !== [], fn ($query) => $query->whereIn('session_id', $sessionIds))
            ->when($yearFrom !== null, fn ($query) => $query->whereYear('date_from', '>=', $yearFrom))
            ->when($yearTo !== null, fn ($query) => $query->whereYear('date_from', '<=', $yearTo))
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderByDesc('date_from')
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'session_id', 'name', 'date_from']);

        return response()->json([
            'data' => $tournaments->map(fn (Tournament $tournament): array => [
                'id' => $tournament->id,
                'session_id' => $tournament->session_id,
                'name' => $tournament->name,
                'date_from' => $tournament->date_from?->toDateString(),
            ]),
        ]);
    }
}
