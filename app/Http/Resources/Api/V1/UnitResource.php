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
    /**
     * @return array{id: int, name: string, unit_type: array{id: int, code: string, name: string, name_en: string|null}}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'unit_type' => [
                'id' => $this->unitType->id,
                'code' => $this->unitType->code,
                'name' => $this->unitType->name,
                'name_en' => $this->unitType->name_en,
            ],
        ];
    }
}
