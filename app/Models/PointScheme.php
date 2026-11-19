<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\PointSchemeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One version of the points table. Version 1 has no start date and so covers
 * every tournament until a later version is published.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $version_number
 * @property string $name
 * @property string $status
 * @property Carbon|null $effective_from
 * @property Carbon|null $published_at
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'version_number', 'name', 'status', 'effective_from', 'published_at', 'notes', 'created_by'])]
#[ObservedBy([AuditObserver::class])]
class PointScheme extends Model
{
    /** @use HasFactory<PointSchemeFactory> */
    use Auditable, HasFactory, Tenanted;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_RETIRED = 'retired';

    public const RESULTS = ['GOLD', 'SILVER', 'BRONZE', 'PARTICIPATION'];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'effective_from' => 'date:Y-m-d',
            'published_at' => 'datetime',
        ];
    }

    /** @return HasMany<PointSchemeRow, $this> */
    public function rows(): HasMany
    {
        return $this->hasMany(PointSchemeRow::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The published version in force for a tournament date: the latest one that
     * started on or before it (a version with no start date counts as the
     * beginning of time). Drafts are never used.
     *
     * @param  Builder<PointScheme>  $query
     */
    #[Scope]
    protected function inForceOn(Builder $query, Carbon|string $date): void
    {
        $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_RETIRED])
            ->where(fn (Builder $dates) => $dates->whereNull('effective_from')->orWhereDate('effective_from', '<=', $date))
            ->orderByRaw('effective_from IS NULL')
            ->orderByDesc('effective_from')
            ->orderByDesc('version_number');
    }
}
