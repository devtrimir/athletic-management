<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\MissingValue;

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
            'current_incharge_rank' => $this->currentInchargeAssignment?->rank,
            'listing_is_active' => $this->when($this->hasAttribute('listing_is_active'), fn () => (bool) $this->listing_is_active),
            'session_status' => $this->when($this->hasAttribute('session_status'), fn () => $this->session_status),
            'session_status_label' => $this->when($this->hasAttribute('session_status_label'), fn () => $this->session_status_label),
            'players_count' => $this->countAttribute('players_count', 'teamMembers'),
            'men_players_count' => $this->countAttribute('men_players_count'),
            'men_gd_players_count' => $this->countAttribute('men_gd_players_count'),
            'men_non_gd_players_count' => $this->countAttribute('men_non_gd_players_count'),
            'women_players_count' => $this->countAttribute('women_players_count'),
            'women_gd_players_count' => $this->countAttribute('women_gd_players_count'),
            'women_non_gd_players_count' => $this->countAttribute('women_non_gd_players_count'),
            'male_players_count' => $this->countAttribute('male_players_count'),
            'female_players_count' => $this->countAttribute('female_players_count'),
            'captains_count' => $this->countAttribute('captains_count'),
            'reserves_count' => $this->countAttribute('reserves_count'),
            'removed_players_count' => $this->countAttribute('removed_players_count', 'teamMemberMovements'),
            'coaches_count' => $this->countAttribute('coaches_count', 'coachAssignments'),
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
                'incharge_id' => $this->currentInchargeAssignment->incharge_id,
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

    private function hasAttribute(string $key): bool
    {
        return array_key_exists($key, $this->resource->getAttributes());
    }

    private function countAttribute(string $key, ?string $relationship = null): mixed
    {
        if ($this->hasAttribute($key)) {
            return (int) $this->resource->getAttribute($key);
        }

        return $relationship === null ? new MissingValue : $this->whenCounted($relationship);
    }
}
