<?php

declare(strict_types=1);

namespace App\Actions\Teams;

use App\Models\Team;
use App\Models\TeamInchargeAssignment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignTeamInchargeAction
{
    /**
     * @param  array{full_name:string,pno:string,rank?:string|null,designation?:string|null,mobile?:string|null,email?:string|null,assigned_at?:string|null,assignment_reason?:string|null,remarks?:string|null}  $data
     */
    public function __invoke(Team $team, array $data, User $actor): TeamInchargeAssignment
    {
        return DB::transaction(function () use ($team, $data, $actor): TeamInchargeAssignment {
            TeamInchargeAssignment::query()
                ->where('team_id', $team->id)
                ->lockForUpdate()
                ->get();

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
                ])->errorBag('assignIncharge');
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
                'assigned_at' => isset($data['assigned_at']) ? Carbon::parse($data['assigned_at']) : now(),
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
