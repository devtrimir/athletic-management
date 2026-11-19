<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\GameLevelFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A category of competition (Olympic, World, National...). Stable across points
 * versions: each version stores its own points per level.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name_en
 * @property string $name_hi
 * @property int $sort_order
 * @property bool $is_active
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'code', 'name_en', 'name_hi', 'sort_order', 'is_active'])]
#[ObservedBy([AuditObserver::class])]
class GameLevel extends Model
{
    /** @use HasFactory<GameLevelFactory> */
    use Auditable, HasFactory, Tenanted;

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<Competition, $this> */
    public function competitions(): HasMany
    {
        return $this->hasMany(Competition::class)->orderBy('sort_order');
    }

    /** @return HasMany<PointSchemeRow, $this> */
    public function pointRows(): HasMany
    {
        return $this->hasMany(PointSchemeRow::class);
    }
}
