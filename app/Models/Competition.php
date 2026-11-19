<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\CompetitionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A named competition (Asian Games, Federation Cup...) that belongs to one game
 * level. A tournament picks its competition and gets its level through it.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $game_level_id
 * @property string $name_en
 * @property string $name_hi
 * @property int $sort_order
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'game_level_id', 'name_en', 'name_hi', 'sort_order', 'is_active'])]
#[ObservedBy([AuditObserver::class])]
class Competition extends Model
{
    /** @use HasFactory<CompetitionFactory> */
    use Auditable, HasFactory, Tenanted;

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<GameLevel, $this> */
    public function gameLevel(): BelongsTo
    {
        return $this->belongsTo(GameLevel::class);
    }

    /** @return HasMany<Tournament, $this> */
    public function tournaments(): HasMany
    {
        return $this->hasMany(Tournament::class);
    }
}
