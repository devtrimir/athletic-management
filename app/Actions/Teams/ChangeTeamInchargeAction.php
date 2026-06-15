<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChangeTeamInchargeAction
{
    /**
     * @param array{full_name:string,pno:string,rank?:string|null,designation?:string|null,mobile?:string|null,email?:string|null,assigned_at?:string|null,assignment_reason?:string|null,removal_reason?:string|null,remarks?:string|null} $data
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

            $pno = trim($data['pno']);

            $existingAssignment = TeamInchargeAssignment::query()
                ->current()
                ->where('pno', $pno)
                ->where('team_id', '!=', $team->id)
                ->lockForUpdate()
                ->first();

            if ($existingAssignment !== null) {
                throw ValidationException::withMessages([
                    'pno' => __('The selected incharge is already assigned to another team.'),
                ]);
            }

            $assignment = TeamInchargeAssignment::create([
                'team_id' => $team->id,
                'incharge_id' => null,
                'full_name' => trim($data['full_name']),
                'pno' => $pno,
                'rank' => $data['rank'] ?? null,
                'designation' => $data['designation'] ?? null,
                'mobile' => $data['mobile'] ?? null,
                'email' => $data['email'] ?? null,
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
