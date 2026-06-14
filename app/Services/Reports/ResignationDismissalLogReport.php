<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ResignationDismissalLogReport
{
    private const STATUSES = ['RESIGNED', 'DISMISSED'];

    /**
     * Return resignation/dismissal log entries ordered by effective_on desc.
     *
     * @param  array{session_id?: int|null, sport_id?: int|null, unit_id?: int|null, tier_id?: int|null}  $filters
     * @return Collection<int, array{id: int, member_code: string, pno: string|null, full_name: string, rank: string|null, current_status: string, effective_on: string, reason: string|null, unit: array{id: int, name: string}|null}>
     */
    public function run(
        int $orgId,
        array $filters,
        ?string $fromDate,
        ?string $toDate,
        ?string $status,
    ): Collection {
        $unitId = $filters['unit_id'] ?? null;
        $statuses = $status !== null ? [$status] : self::STATUSES;

        $rows = DB::table('members as m')
            ->join('member_status_history as msh', 'msh.member_id', '=', 'm.id')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->select([
                'm.id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.current_status',
                'msh.effective_on',
                'msh.reason',
                'u.id as unit_id',
                'u.name as unit_name',
            ])
            ->where('m.organization_id', $orgId)
            ->whereNull('m.deleted_at')
            ->whereIn('msh.status', $statuses)
            ->whereIn('m.current_status', self::STATUSES)
            ->when($fromDate, fn ($q) => $q->where('msh.effective_on', '>=', $fromDate))
            ->when($toDate, fn ($q) => $q->where('msh.effective_on', '<=', $toDate))
            ->when($unitId, fn ($q) => $q->where('m.current_unit_id', $unitId))
            ->orderByDesc('msh.effective_on')
            ->orderBy('m.full_name')
            ->get();

        return $rows->map(fn (object $row): array => [
            'id' => $row->id,
            'member_code' => $row->member_code,
            'pno' => $row->pno,
            'full_name' => $row->full_name,
            'rank' => $row->rank,
            'current_status' => $row->current_status,
            'effective_on' => substr((string) $row->effective_on, 0, 10),
            'reason' => $row->reason,
            'unit' => $row->unit_id !== null
                ? ['id' => $row->unit_id, 'name' => $row->unit_name]
                : null,
        ]);
    }
}
