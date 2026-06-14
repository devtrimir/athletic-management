<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Coach;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Inertia prop shape for Coach.
 *
 * @mixin Coach
 */
class CoachResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'pno' => $this->pno,
            'mobile' => $this->mobile,
            'nis_certified' => $this->nis_certified,
            'member' => $this->whenLoaded('member', fn () => [
                'id' => $this->member->id,
                'member_code' => $this->member->member_code,
                'full_name' => $this->member->full_name,
                'pno' => $this->member->pno,
                'rank' => $this->member->rank,
            ]),
        ];
    }
}
