<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;

class UpdateTeamAction
{
    /**
     * @param  array{
     *     sport_id: int,
     *     session_id: int,
     *     location_type: string,
     *     district_id?: int|null,
     *     unit_id?: int|null,
     *     name: string,
     *     in_charge?: string|null,
     *     is_active?: bool
     * }  $data
     */
    public function __invoke(Team $team, array $data): Team
    {
        return DB::transaction(function () use ($team, $data): Team {
            [$unitId, $districtId] = $this->resolveLocation(
                $team->organization_id,
                $data['location_type'],
                $data['unit_id'] ?? null,
                $data['district_id'] ?? null,
            );

            $team->update([
                'sport_id' => $data['sport_id'],
                'session_id' => $data['session_id'],
                'location_type' => $data['location_type'],
                'district_id' => $districtId,
                'unit_id' => $unitId,
                'name' => $data['name'],
                'is_active' => $data['is_active'] ?? true,
            ]);

            return $team->fresh(['sport', 'session', 'unit', 'district']);
        });
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function resolveLocation(
        int $organizationId,
        string $locationType,
        ?int $unitId,
        ?int $districtId,
    ): array {
        if ($locationType === 'unit') {
            $unit = Unit::query()
                ->where('organization_id', $organizationId)
                ->findOrFail($unitId);

            return [$unit->id, $unit->district_id];
        }

        return [null, $districtId];
    }
}
