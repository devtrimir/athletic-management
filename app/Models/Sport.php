<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\SportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string|null $code
 * @property string $category
 * @property string $slug
 * @property string|null $description
 * @property bool $is_active
 * @property int $sort_order
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'name', 'code', 'category', 'slug', 'description', 'is_active', 'sort_order'])]
#[ObservedBy([AuditObserver::class])]
class Sport extends Model
{
    /** @use HasFactory<SportFactory> */
    use Auditable, HasFactory, Tenanted;

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return HasMany<SportEvent, $this> */
    public function sportEvents(): HasMany
    {
        return $this->hasMany(SportEvent::class);
    }

    /** @return HasMany<SportEventVariant, $this> */
    public function eventVariants(): HasMany
    {
        return $this->hasMany(SportEventVariant::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
