<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\CoachSportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
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
 * @property int|null $level_master_id
 * @property string|null $level
 * @property string|null $sport_event
 * @property Carbon|null $effective_from
 * @property Carbon|null $effective_to
 * @property string|null $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read Sport $sport
 * @property-read TournamentTier|null $levelMaster
 */
#[Fillable([
    'coach_id',
    'sport_id',
    'is_primary',
    'level_master_id',
    'level',
    'sport_event',
    'effective_from',
    'effective_to',
    'notes',
])]
#[ObservedBy([AuditObserver::class])]
#[Table(incrementing: true)]
class CoachSport extends Pivot
{
    /** @use HasFactory<CoachSportFactory> */
    use Auditable, HasFactory;

    public $incrementing = true;

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

    public function levelMaster(): BelongsTo
    {
        return $this->belongsTo(TournamentTier::class, 'level_master_id');
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
