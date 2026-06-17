<?php

namespace App\Models;

use App\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'code',
    'name',
    'short_name',
    'rank_order',
    'cadre_type',
    'is_gazetted',
    'aliases',
    'is_active',
])]
#[ObservedBy([AuditObserver::class])]
class Rank extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'aliases' => 'array',
            'is_gazetted' => 'boolean',
            'is_active' => 'boolean',
            'rank_order' => 'integer',
        ];
    }

    public function designations(): HasMany
    {
        return $this->hasMany(
            Designation::class,
            'mapped_rank_code',
            'code'
        );
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('rank_order');
    }
}
