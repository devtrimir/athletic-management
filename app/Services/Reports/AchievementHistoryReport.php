<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AchievementHistoryReport
{
    /**
     * Return all achievements for the organisation, optionally filtered.
     *
     * Join path: achievements → participations → members + events → tournaments
     * LEFT JOIN tournament_tiers (tournaments.tier_id may be null)
     * LEFT JOIN sports (events.sport_id)
     * LEFT JOIN sport_sessions (tournaments.session_id)
     *
     * @param  array{session_id?: int|null, sport_id?: int|null, unit_id?: int|null, tier_id?: int|null, member_name?: string|null, pno?: string|null, tournament_id?: int|null, event_name?: string|null}  $filters
     * @return Collection<int, array{
     *     member: array{id: int, member_code: string, pno: string|null, full_name: string, rank: string|null},
     *     tournament: array{id: int, name: string, date_from: string|null, tier_label_hi: string|null, sport_name: string|null},
     *     event: array{id: int, name: string, discipline: string|null},
     *     session: array{name: string},
     *     medal_type: string,
     *     position: int|null,
     * }>
     */
    public function run(int $orgId, array $filters): Collection
    {
        $sessionId = $filters['session_id'] ?? null;
        $sportId = $filters['sport_id'] ?? null;
        $tierId = $filters['tier_id'] ?? null;
        $unitId = $filters['unit_id'] ?? null;
        $memberName = $filters['member_name'] ?? null;
        $pno = $filters['pno'] ?? null;
        $tournamentId = $filters['tournament_id'] ?? null;
        $eventName = $filters['event_name'] ?? null;

        $rows = DB::table('achievements as a')
            ->join('participations as p', 'p.id', '=', 'a.participation_id')
            ->join('members as m', 'm.id', '=', 'p.member_id')
            ->join('events as e', 'e.id', '=', 'p.event_id')
            ->join('tournaments as t', 't.id', '=', 'e.tournament_id')
            ->leftJoin('tournament_tiers as tt', 'tt.id', '=', 't.tier_id')
            ->leftJoin('sports as s', 's.id', '=', 'e.sport_id')
            ->leftJoin('sport_sessions as ss', 'ss.id', '=', 't.session_id')
            ->select([
                'm.id as member_id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                't.id as tournament_id',
                't.name as tournament_name',
                't.date_from',
                'tt.label_hi as tier_label_hi',
                's.name as sport_name',
                'e.id as event_id',
                'e.name as event_name',
                'e.discipline',
                'ss.name as session_name',
                'a.medal_type',
                'p.position',
            ])
            ->where('t.organization_id', $orgId)
            ->whereNull('t.deleted_at')
            ->whereNull('m.deleted_at')
            ->when($sessionId, fn ($q) => $q->where('t.session_id', $sessionId))
            ->when($sportId, fn ($q) => $q->where('e.sport_id', $sportId))
            ->when($tierId, fn ($q) => $q->where('t.tier_id', $tierId))
            ->when($unitId, fn ($q) => $q->where('m.current_unit_id', $unitId))
            ->when($memberName, fn ($q) => $q->where('m.full_name', 'like', "%{$memberName}%"))
            ->when($pno, fn ($q) => $q->where('m.pno', 'like', "%{$pno}%"))
            ->when($tournamentId, fn ($q) => $q->where('t.id', $tournamentId))
            ->when($eventName, fn ($q) => $q->where('e.name', 'like', "%{$eventName}%"))
            ->orderByDesc('t.date_from')
            ->orderBy('m.full_name')
            ->get();

        return $rows->map(fn (object $row): array => [
            'member' => [
                'id' => $row->member_id,
                'member_code' => $row->member_code,
                'pno' => $row->pno,
                'full_name' => $row->full_name,
                'rank' => $row->rank,
            ],
            'tournament' => [
                'id' => $row->tournament_id,
                'name' => $row->tournament_name,
                'date_from' => $row->date_from !== null ? substr((string) $row->date_from, 0, 10) : null,
                'tier_label_hi' => $row->tier_label_hi,
                'sport_name' => $row->sport_name,
            ],
            'event' => [
                'id' => $row->event_id,
                'name' => $row->event_name,
                'discipline' => $row->discipline,
            ],
            'session' => ['name' => $row->session_name ?? ''],
            'medal_type' => $row->medal_type,
            'position' => $row->position,
        ]);
    }
}
