<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CoachAlias;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CoachAlias
 */
class CoachAliasResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'alias' => $this->alias,
            'source' => $this->source,
        ];
    }
}
