<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'sport_id',
    'gender_category_id',
    'name',
    'name_en',
    'code',
    'min_weight',
    'max_weight',
    'is_active',
    'sort_order',
])]
class WeightCategory extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'min_weight' => 'decimal:2',
            'max_weight' => 'decimal:2',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /** @return BelongsTo<GenderCategory, $this> */
    public function genderCategory(): BelongsTo
    {
        return $this->belongsTo(GenderCategory::class);
    }

    /** @return HasMany<SportEventVariant, $this> */
    public function eventVariants(): HasMany
    {
        return $this->hasMany(SportEventVariant::class);
    }
}
