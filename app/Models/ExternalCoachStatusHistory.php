<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ExternalCoachStatusHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $external_coach_id
 * @property string $status
 * @property string|null $reason
 * @property int|null $recorded_by
 * @property Carbon $recorded_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read ExternalCoach $externalCoach
 * @property-read User|null $recordedBy
 */
#[Fillable(['external_coach_id', 'status', 'reason', 'recorded_by', 'recorded_at'])]
class ExternalCoachStatusHistory extends Model
{
    /** @use HasFactory<ExternalCoachStatusHistoryFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ExternalCoach, $this> */
    public function externalCoach(): BelongsTo
    {
        return $this->belongsTo(ExternalCoach::class);
    }

    /** @return BelongsTo<User, $this> */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
