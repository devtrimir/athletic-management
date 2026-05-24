<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Coach;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Frozen coach search-hit contract.
 * Do NOT add or remove fields without updating all pickers.
 *
 * @mixin Coach
 */
class CoachSearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name_hi' => $this->full_name_hi,
            'full_name_en' => $this->full_name_en,
            'pno' => $this->pno,
            'nis_certified' => (bool) $this->nis_certified,
        ];
    }
}
