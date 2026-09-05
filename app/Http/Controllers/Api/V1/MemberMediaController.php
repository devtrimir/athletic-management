<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
use App\Models\Member;
use App\Models\Participation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Returns all media files belonging to a member, structured for the
 * Finder-like Media tab (grouped by tournament → event, filterable).
 *
 * GET /api/v1/members/{member}/media
 *
 * Optional query params:
 *   filter[tournament_id]  — filter by tournament
 *   filter[sport_id]       — filter by sport (via event)
 *   filter[session_id]     — filter by session
 *   filter[medal_type]     — gold|silver|bronze|none (participation must have matching achievement)
 *   filter[context]        — participation|achievement (mediable_type filter)
 *   view                   — grid|list|large (stored client-side; passed through for telemetry only)
 */
class MemberMediaController extends Controller
{
    /**
     * @return Collection<int, int>
     */
    private function memberParticipationIds(Member $member): Collection
    {
        $directIds = $member->participations()->pluck('id');

        $teamIds = Participation::query()
            ->whereExists(function ($query) use ($member): void {
                $query->select(DB::raw(1))
                    ->from('team_members')
                    ->whereColumn('team_members.team_id', 'participations.team_id')
                    ->whereColumn('team_members.session_id', 'participations.session_id')
                    ->where('team_members.member_id', $member->id)
                    ->whereNull('team_members.left_on');
            })
            ->pluck('id');

        return $directIds->merge($teamIds)->unique()->values();
    }

    public function __invoke(Request $request, Member $member): JsonResponse
    {
        Gate::authorize('view', $member);

        $participationIds = $this->memberParticipationIds($member);

        // Base: all media for participations this member has (direct or team lineup)
        $query = MediaFile::with(['uploader:id,name', 'mediable'])
            ->where('organization_id', $member->organization_id)
            ->where(function ($q) use ($participationIds) {
                // Media on Participation
                $q->where(function ($q2) use ($participationIds) {
                    $q2->where('mediable_type', Participation::class)
                        ->whereIn('mediable_id', $participationIds);
                });
            })
            ->orderByDesc('created_at');

        // ── Filters ───────────────────────────────────────────────────────────

        $filters = $request->input('filter', []);

        if (! empty($filters['context'])) {
            $map = [
                'participation' => Participation::class,
            ];
            $type = $map[$filters['context']] ?? null;
            if ($type !== null) {
                $query->where('mediable_type', $type);
            }
        }

        if (! empty($filters['tournament_id'])) {
            $tournamentId = (int) $filters['tournament_id'];
            $filteredIds = Participation::whereIn('id', $participationIds)
                ->whereHas('event', fn ($q) => $q->where('tournament_id', $tournamentId))
                ->pluck('id');
            $query->where('mediable_type', Participation::class)
                ->whereIn('mediable_id', $filteredIds);
        }

        if (! empty($filters['sport_id'])) {
            $sportId = (int) $filters['sport_id'];
            $filteredIds = Participation::whereIn('id', $participationIds)
                ->whereHas('event', fn ($q) => $q->where('sport_id', $sportId))
                ->pluck('id');
            $query->where('mediable_type', Participation::class)
                ->whereIn('mediable_id', $filteredIds);
        }

        if (! empty($filters['session_id'])) {
            $sessionId = (int) $filters['session_id'];
            $filteredIds = Participation::whereIn('id', $participationIds)
                ->where('session_id', $sessionId)
                ->pluck('id');
            $query->where('mediable_type', Participation::class)
                ->whereIn('mediable_id', $filteredIds);
        }

        if (! empty($filters['medal_type'])) {
            $medalType = strtoupper($filters['medal_type']);
            $filteredIds = Participation::whereIn('id', $participationIds)
                ->whereHas('achievement', fn ($q) => $q->where('medal_type', $medalType))
                ->pluck('id');
            $query->where('mediable_type', Participation::class)
                ->whereIn('mediable_id', $filteredIds);
        }

        $mediaFiles = $query->get();

        // ── Group by tournament → event ────────────────────────────────────
        // Pre-load participation context for grouping without N+1
        $participationIds = $mediaFiles
            ->where('mediable_type', Participation::class)
            ->pluck('mediable_id')
            ->unique();

        $participations = Participation::whereIn('id', $participationIds)
            ->with([
                'event:id,tournament_id,sport_id,name',
                'event.tournament:id,name,date_from,tier_id',
                'event.tournament.tier:id,code,label_hi',
                'event.sport:id,name',
                'achievement:participation_id,medal_type',
            ])
            ->get()
            ->keyBy('id');

        $grouped = $mediaFiles->groupBy(function (MediaFile $mf) use ($participations) {
            if ($mf->mediable_type === Participation::class) {
                $p = $participations->get($mf->mediable_id);

                return $p?->event?->tournament_id ?? 0;
            }

            return 0;
        });

        $tournaments = $grouped->map(function ($files, $tournamentId) use ($participations) {
            /** @var Collection<int, MediaFile> $files */
            $sampleParticipation = $participations
                ->filter(fn ($p) => $p->event->tournament_id === $tournamentId)
                ->first();

            $tournament = $sampleParticipation?->event?->tournament;

            $byEvent = $files->groupBy(function (MediaFile $mf) use ($participations) {
                if ($mf->mediable_type === Participation::class) {
                    return $participations->get($mf->mediable_id)?->event_id ?? 0;
                }

                return 0;
            });

            $events = $byEvent->map(function ($eventFiles, $eventId) use ($participations) {
                /** @var Collection<int, MediaFile> $eventFiles */
                $sampleP = $participations->filter(fn ($p) => $p->event_id === $eventId)->first();
                $event = $sampleP?->event;

                return [
                    'event' => $event ? [
                        'id' => $event->id,
                        'name' => $event->name,
                        'sport' => $event->sport ? ['id' => $event->sport->id, 'name' => $event->sport->name] : null,
                    ] : null,
                    'media' => MediaFileResource::collection($eventFiles->values()),
                    'count' => $eventFiles->count(),
                ];
            })->values();

            return [
                'tournament' => $tournament ? [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'date_from' => $tournament->date_from?->toDateString(),
                    'tier' => $tournament->tier ? ['code' => $tournament->tier->code, 'label_hi' => $tournament->tier->label_hi] : null,
                ] : null,
                'events' => $events,
                'total' => $files->count(),
            ];
        })->values();

        return response()->json([
            'data' => $tournaments,
            'total' => $mediaFiles->count(),
        ]);
    }
}
