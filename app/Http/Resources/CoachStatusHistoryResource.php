<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CoachStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CoachStatusHistory
 */
class CoachStatusHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'effective_on' => $this->effective_on->toDateString(),
            'reason' => $this->reason,
            'recorded_by_name' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
        ];
    }
}
