<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Frozen search-hit contract (ADR-0004).
 * Do NOT add or remove fields without a phase-8 migration plan.
 *
 * @mixin Member
 */
class MemberSearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'member_code' => $this->member_code,
            'pno' => $this->pno,
            'full_name_hi' => $this->full_name_hi,
            'full_name_en' => $this->full_name_en,
            'player_category' => $this->player_category,
            'player_level' => $this->player_level,
            'current_status' => $this->current_status,
        ];
    }
}
