<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\NameAlias;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NameAlias
 */
class NameAliasResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'alias_hi' => $this->alias_hi,
            'source' => $this->source,
        ];
    }
}
