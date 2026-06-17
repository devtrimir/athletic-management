<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\CoachAliasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $coach_id
 * @property string $alias
 * @property string|null $alias_normalized
 * @property string $source
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Coach $coach
 */
#[Fillable(['coach_id', 'alias', 'alias_normalized', 'source'])]
#[ObservedBy([AuditObserver::class])]
class CoachAlias extends Model
{
    /** @use HasFactory<CoachAliasFactory> */
    use Auditable, HasFactory;

    public function coach(): BelongsTo
    {
        return $this->belongsTo(Coach::class);
    }
}
