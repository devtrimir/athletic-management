<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\CoachStatusHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $coach_id
 * @property string $status
 * @property Carbon $effective_on
 * @property string|null $reason
 * @property int|null $recorded_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 * @property-read User|null $recorder
 */
#[Fillable(['coach_id', 'status', 'effective_on', 'reason', 'recorded_by'])]
#[ObservedBy([AuditObserver::class])]
class CoachStatusHistory extends Model
{
    /** @use HasFactory<CoachStatusHistoryFactory> */
    use Auditable, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_on' => 'date',
        ];
    }

    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
