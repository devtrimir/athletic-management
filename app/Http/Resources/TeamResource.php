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
            'name_hi' => $this->name_hi,
            'in_charge_hi' => $this->in_charge_hi,
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
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'name_hi' => $this->unit->name_hi,
            ]),
        ];
    }
}
