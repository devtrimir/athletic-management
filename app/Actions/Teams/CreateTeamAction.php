<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\Unit;
use App\Support\Teams\TeamSessionStatusManager;
use Illuminate\Support\Facades\DB;

class CreateTeamAction
{
    public function __construct(
        private readonly TeamSessionStatusManager $teamSessionStatusManager,
    ) {}

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
    public function __invoke(array $data, int $organizationId): Team
    {
        return DB::transaction(function () use ($data, $organizationId): Team {
            [$unitId, $districtId] = $this->resolveLocation(
                $organizationId,
                $data['location_type'],
                $this->toNullableInt($data['unit_id'] ?? null),
                $this->toNullableInt($data['district_id'] ?? null),
            );

            $team = Team::create([
                'organization_id' => $organizationId,
                'sport_id' => $data['sport_id'],
                'session_id' => $data['session_id'],
                'location_type' => $data['location_type'],
                'district_id' => $districtId,
                'unit_id' => $unitId,
                'name' => $data['name'],
                'in_charge' => null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            ($data['is_active'] ?? true)
                ? $this->teamSessionStatusManager->ensureActive($team, (int) $data['session_id'])
                : $this->teamSessionStatusManager->ensureInactive($team, (int) $data['session_id']);

            return $team;
        });
    }

    private function toNullableInt(int|string|null $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
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
                ->with('district:id')
                ->findOrFail($unitId);

            return [$unit->id, $unit->district_id];
        }

        return [null, $districtId];
    }
}
