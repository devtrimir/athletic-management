<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Inertia prop shape for Team.
 *
 * @mixin Team
 */
class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'in_charge' => $this->in_charge,
            'location_type' => $this->location_type,
            'location_name' => $this->location_name,
            'location_label' => $this->location_label,
            'is_active' => $this->is_active,
            'current_incharge_name' => $this->current_incharge_name,
            'current_incharge_pno' => $this->current_incharge_pno,
            'current_incharge_designation' => $this->current_incharge_designation,
            'current_incharge_mobile' => $this->current_incharge_mobile,
            'current_incharge_since' => $this->current_incharge_since,
            'has_current_incharge' => $this->has_current_incharge,
            'players_count' => $this->whenCounted('teamMembers'),
            'coaches_count' => $this->whenCounted('coachAssignments'),
            'sport' => $this->whenLoaded('sport', fn () => [
                'id' => $this->sport->id,
                'name' => $this->sport->name,
            ]),
            'session' => $this->whenLoaded('session', fn () => [
                'id' => $this->session->id,
                'name' => $this->session->name,
            ]),
            'district' => $this->whenLoaded('district', fn () => [
                'id' => $this->district->id,
                'name' => $this->district->name,
            ]),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'name' => $this->unit->name,
            ]),
            'current_incharge_assignment' => $this->whenLoaded('currentInchargeAssignment', fn () => $this->currentInchargeAssignment ? [
                'id' => $this->currentInchargeAssignment->id,
                'full_name' => $this->currentInchargeAssignment->full_name,
                'pno' => $this->currentInchargeAssignment->pno,
                'rank' => $this->currentInchargeAssignment->rank,
                'designation' => $this->currentInchargeAssignment->designation,
                'mobile' => $this->currentInchargeAssignment->mobile,
                'email' => $this->currentInchargeAssignment->email,
                'assigned_at' => $this->currentInchargeAssignment->assigned_at?->toDateTimeString(),
                'assignment_reason' => $this->currentInchargeAssignment->assignment_reason,
                'remarks' => $this->currentInchargeAssignment->remarks,
            ] : null),
        ];
    }
}
