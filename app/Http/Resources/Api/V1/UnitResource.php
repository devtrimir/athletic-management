<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Unit
 */
class UnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name_hi' => $this->name_hi,
            'name_en' => $this->name_en,
            'unit_type' => $this->unit_type,
        ];
    }
}
