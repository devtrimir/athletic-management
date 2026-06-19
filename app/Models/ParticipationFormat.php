<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'code',
    'description',
    'min_players',
    'max_players',
    'is_team_based',
    'is_mixed',
    'is_active',
    'sort_order',
])]
class ParticipationFormat extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'min_players' => 'integer',
            'max_players' => 'integer',
            'is_team_based' => 'boolean',
            'is_mixed' => 'boolean',
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
