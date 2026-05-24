<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Frozen member-teams contract. Do NOT add or remove fields without a migration plan.
 *
 * @mixin TeamMember
 */
class MemberTeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'joined_on' => $this->joined_on?->toDateString(),
            'left_on' => $this->left_on?->toDateString(),
            'team' => [
                'id' => $this->team->id,
                'name_hi' => $this->team->name_hi,
            ],
            'sport' => [
                'id' => $this->team->sport->id,
                'name' => $this->team->sport->name,
            ],
            'session' => [
                'id' => $this->session->id,
                'name' => $this->session->name,
            ],
        ];
    }
}
