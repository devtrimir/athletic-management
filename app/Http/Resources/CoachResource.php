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
            'full_name_hi' => $this->full_name_hi,
            'full_name_en' => $this->full_name_en,
            'pno' => $this->pno,
            'mobile' => $this->mobile,
            'nis_certified' => $this->nis_certified,
            'member' => $this->whenLoaded('member', fn () => [
                'id' => $this->member->id,
                'member_code' => $this->member->member_code,
                'full_name_hi' => $this->member->full_name_hi,
                'pno' => $this->member->pno,
                'rank' => $this->member->rank,
            ]),
        ];
    }
}
