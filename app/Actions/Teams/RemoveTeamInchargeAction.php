<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RemoveTeamInchargeAction
{
    /**
     * @param  array{removed_at?:string|null,removal_reason?:string|null,remarks?:string|null}  $data
     */
    public function __invoke(Team $team, array $data, User $actor): TeamInchargeAssignment
    {
        return DB::transaction(function () use ($team, $data, $actor): TeamInchargeAssignment {
            $assignment = TeamInchargeAssignment::query()
                ->where('team_id', $team->id)
                ->where('is_current', true)
                ->lockForUpdate()
                ->firstOrFail();

            $removedAt = isset($data['removed_at']) ? Carbon::parse($data['removed_at']) : now();

            $assignment->update([
                'is_current' => false,
                'current_team_id' => null,
                'removed_at' => $removedAt,
                'removed_by' => $actor->id,
                'removal_reason' => $data['removal_reason'] ?? null,
                'remarks' => $data['remarks'] ?? $assignment->remarks,
            ]);

            $team->forceFill(['in_charge' => null])->save();

            return $assignment->fresh(['removedBy']);
        });
    }
}
