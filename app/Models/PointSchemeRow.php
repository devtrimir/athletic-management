<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\PointSchemeRowFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The points a version gives for one result at one game level.
 *
 * @property int $id
 * @property int $point_scheme_id
 * @property int $game_level_id
 * @property string $result
 * @property int $points
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['point_scheme_id', 'game_level_id', 'result', 'points'])]
#[ObservedBy([AuditObserver::class])]
class PointSchemeRow extends Model
{
    /** @use HasFactory<PointSchemeRowFactory> */
    use Auditable, HasFactory;

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    /** @return BelongsTo<PointScheme, $this> */
    public function scheme(): BelongsTo
    {
        return $this->belongsTo(PointScheme::class, 'point_scheme_id');
    }

    /** @return BelongsTo<GameLevel, $this> */
    public function gameLevel(): BelongsTo
    {
        return $this->belongsTo(GameLevel::class);
    }
}
