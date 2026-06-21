<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\InchargeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'organization_id',
    'full_name',
    'pno',
    'rank',
    'designation',
    'mobile',
    'email',
    'is_active',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class Incharge extends Model
{
    /** @use HasFactory<InchargeFactory> */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return HasMany<TeamInchargeAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(TeamInchargeAssignment::class)->latest('assigned_at');
    }

    /** @return HasMany<TeamInchargeAssignment, $this> */
    public function currentAssignments(): HasMany
    {
        return $this->hasMany(TeamInchargeAssignment::class)->where('is_current', true);
    }

    /** @param Builder<Incharge> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
