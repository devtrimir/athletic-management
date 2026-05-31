<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\AchievementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $participation_id
 * @property string $medal_type
 * @property int|null $position
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Participation $participation
 */
#[Fillable([
    'participation_id',
    'medal_type',
    'position',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class Achievement extends Model
{
    /** @use HasFactory<AchievementFactory> */
    use Auditable, HasFactory;

    /** @return BelongsTo<Participation, $this> */
    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }

    /** @return MorphMany<AchievementBenefit, $this> */
    public function benefits(): MorphMany
    {
        return $this->morphMany(AchievementBenefit::class, 'benefitable');
    }
}
