<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use Database\Factories\CoachSportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $coach_id
 * @property int $sport_id
 * @property bool $is_primary
 * @property string|null $level
 * @property Carbon|null $effective_from
 * @property Carbon|null $effective_to
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read Sport $sport
 */
#[Fillable([
    'coach_id',
    'sport_id',
    'is_primary',
    'level',
    'effective_from',
    'effective_to',
    'notes',
])]
#[Table(incrementing: true)]
class CoachSport extends Pivot
{
    /** @use HasFactory<CoachSportFactory> */
    use Auditable, HasFactory;

    public bool $incrementing = true;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    /** @return BelongsTo<Coach, $this> */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    /** @return BelongsTo<Sport, $this> */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }
}
