<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\TournamentTier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TournamentTier
 */
class TournamentTierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'label_hi' => $this->label_hi,
            'label_en' => $this->label_en,
            'weight' => $this->weight,
        ];
    }
}
