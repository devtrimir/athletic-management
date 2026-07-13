<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'name_en', 'code', 'min_age', 'max_age', 'is_active', 'sort_order'])]
class AgeCategory extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'min_age' => 'integer',
            'max_age' => 'integer',
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
