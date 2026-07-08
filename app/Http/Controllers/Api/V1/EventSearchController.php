<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'sport_ids' => ['nullable', 'array'],
            'sport_ids.*' => ['integer', 'exists:sports,id'],
            'tournament_ids' => ['nullable', 'array'],
            'tournament_ids.*' => ['integer'],
            'year_from' => ['nullable', 'integer', 'min:1900', 'max:2099'],
            'year_to' => ['nullable', 'integer', 'min:1900', 'max:2099'],
        ]);

        $sportIds = array_map('intval', $validated['sport_ids'] ?? []);
        $tournamentIds = array_map('intval', $validated['tournament_ids'] ?? []);

        if ($sportIds === [] && $tournamentIds === []) {
            return response()->json(['data' => []]);
        }

        $yearFrom = $validated['year_from'] ?? null;
        $yearTo = $validated['year_to'] ?? null;
        $search = trim((string) ($validated['q'] ?? ''));

        $events = Event::query()
            ->join('tournaments as t', 't.id', '=', 'events.tournament_id')
            ->where('t.organization_id', (int) $request->user()->organization_id)
            ->whereNull('t.deleted_at')
            ->when($tournamentIds !== [], fn ($query) => $query->whereIn('events.tournament_id', $tournamentIds))
            ->when($sportIds !== [], fn ($query) => $query->whereIn('events.sport_id', $sportIds))
            ->when($yearFrom !== null, fn ($query) => $query->whereYear('t.date_from', '>=', $yearFrom))
            ->when($yearTo !== null, fn ($query) => $query->whereYear('t.date_from', '<=', $yearTo))
            ->when($search !== '', fn ($query) => $query->where('events.name', 'like', "%{$search}%"))
            ->orderBy('events.name')
            ->limit(25)
            ->get([
                'events.id',
                'events.tournament_id',
                'events.sport_id',
                'events.name',
                't.name as tournament_name',
            ]);

        return response()->json([
            'data' => $events->map(fn (Event $event): array => [
                'id' => $event->id,
                'tournament_id' => $event->tournament_id,
                'sport_id' => $event->sport_id,
                'name' => $event->name,
                'tournament_name' => $event->tournament_name,
            ]),
        ]);
    }
}
