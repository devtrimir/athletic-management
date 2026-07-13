<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'name_en', 'code', 'is_active', 'sort_order'])]
class GenderCategory extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return HasMany<SportEventVariant, $this> */
    public function eventVariants(): HasMany
    {
        return $this->hasMany(SportEventVariant::class);
    }
}
