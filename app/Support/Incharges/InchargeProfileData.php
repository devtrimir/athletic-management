<?php

declare(strict_types=1);

namespace App\Support\Incharges;

use App\Models\Incharge;
use App\Models\TeamInchargeAssignment;
use App\Services\AuditLogBuilder;

class InchargeProfileData
{
    public function __construct(private readonly AuditLogBuilder $auditLogBuilder) {}

    /** @return array<string, mixed> */
    public function overview(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'overview',
            'summary' => [
                'current_teams_count' => $incharge->currentAssignments()->count(),
                'total_assignments_count' => $incharge->assignments()->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function teams(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'teams',
            'assignments' => $this->assignments($incharge),
        ];
    }

    /** @return array<string, mixed> */
    public function changelog(Incharge $incharge): array
    {
        return [
            ...$this->shell($incharge),
            'activeTab' => 'changelog',
            'auditLog' => $this->auditLogBuilder->forIncharge($incharge),
        ];
    }

    /** @return array<string, mixed> */
    private function shell(Incharge $incharge): array
    {
        return [
            'incharge' => [
                'id' => $incharge->id,
                'full_name' => $incharge->full_name,
                'pno' => $incharge->pno,
                'rank' => $incharge->rank,
                'designation' => $incharge->designation,
                'mobile' => $incharge->mobile,
                'email' => $incharge->email,
                'is_active' => $incharge->is_active,
                'remarks' => $incharge->remarks,
            ],
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function assignments(Incharge $incharge): array
    {
        return TeamInchargeAssignment::query()
            ->where('incharge_id', $incharge->id)
            ->with(['team:id,name,sport_id,session_id,unit_id,district_id', 'team.sport:id,name', 'team.session:id,name', 'team.unit:id,name', 'team.district:id,name', 'assignedBy:id,name', 'removedBy:id,name'])
            ->latest('assigned_at')
            ->get()
            ->map(fn (TeamInchargeAssignment $assignment): array => [
                'id' => $assignment->id,
                'full_name' => $assignment->full_name,
                'pno' => $assignment->pno,
                'rank' => $assignment->rank,
                'designation' => $assignment->designation,
                'mobile' => $assignment->mobile,
                'email' => $assignment->email,
                'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
                'removed_at' => $assignment->removed_at?->toDateTimeString(),
                'assignment_reason' => $assignment->assignment_reason,
                'removal_reason' => $assignment->removal_reason,
                'remarks' => $assignment->remarks,
                'is_current' => $assignment->is_current,
                'team' => $assignment->team ? [
                    'id' => $assignment->team->id,
                    'name' => $assignment->team->name,
                    'sport' => $assignment->team->sport ? ['id' => $assignment->team->sport->id, 'name' => $assignment->team->sport->name] : null,
                    'session' => $assignment->team->session ? ['id' => $assignment->team->session->id, 'name' => $assignment->team->session->name] : null,
                    'unit' => $assignment->team->unit ? ['id' => $assignment->team->unit->id, 'name' => $assignment->team->unit->name] : null,
                    'district' => $assignment->team->district ? ['id' => $assignment->team->district->id, 'name' => $assignment->team->district->name] : null,
                ] : null,
                'assigned_by' => $assignment->assignedBy ? ['id' => $assignment->assignedBy->id, 'name' => $assignment->assignedBy->name] : null,
                'removed_by' => $assignment->removedBy ? ['id' => $assignment->removedBy->id, 'name' => $assignment->removedBy->name] : null,
            ])
            ->all();
    }
}
