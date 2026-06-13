<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\ParticipationAwardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $participation_id
 * @property string $award_type
 * @property string $title
 * @property int|null $points_override
 * @property string|null $remarks
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Participation $participation
 */
#[Fillable([
    'organization_id',
    'participation_id',
    'award_type',
    'title',
    'points_override',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class ParticipationAward extends Model
{
    /** @use HasFactory<ParticipationAwardFactory> */
    use Auditable, HasFactory, Tenanted;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points_override' => 'integer',
        ];
    }

    /** @return BelongsTo<Participation, $this> */
    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }
}
