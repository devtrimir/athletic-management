<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ChangeTeamInchargeAction
{
    /**
     * @param  array{incharge_id:int,assigned_at?:string|null,assignment_reason?:string|null,removal_reason?:string|null,remarks?:string|null}  $data
     */
    public function __invoke(Team $team, array $data, User $actor): TeamInchargeAssignment
    {
        return DB::transaction(function () use ($team, $data, $actor): TeamInchargeAssignment {
            $currentAssignment = TeamInchargeAssignment::query()
                ->where('team_id', $team->id)
                ->where('is_current', true)
                ->lockForUpdate()
                ->firstOrFail();

            $changeAt = isset($data['assigned_at']) ? Carbon::parse($data['assigned_at']) : now();

            $currentAssignment->update([
                'is_current' => false,
                'current_team_id' => null,
                'removed_at' => $changeAt,
                'removed_by' => $actor->id,
                'removal_reason' => $data['removal_reason'] ?? null,
                'remarks' => $data['remarks'] ?? $currentAssignment->remarks,
            ]);

            $incharge = $team->organization->incharges()->active()->findOrFail((int) $data['incharge_id']);

            $assignment = TeamInchargeAssignment::create([
                'team_id' => $team->id,
                'incharge_id' => $incharge->id,
                'full_name' => $incharge->full_name,
                'pno' => $incharge->pno,
                'rank' => $incharge->rank,
                'designation' => $incharge->designation,
                'mobile' => $incharge->mobile,
                'email' => $incharge->email,
                'assigned_at' => $changeAt,
                'assigned_by' => $actor->id,
                'assignment_reason' => $data['assignment_reason'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'is_current' => true,
                'current_team_id' => $team->id,
            ]);

            $team->forceFill(['in_charge' => $assignment->full_name])->save();

            return $assignment->load(['assignedBy']);
        });
    }
}
