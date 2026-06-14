<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\MemberStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MemberStatusHistory
 */
class MemberStatusHistoryResource extends JsonResource
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
