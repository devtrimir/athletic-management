<?php

namespace App\Models;

use App\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'code',
    'name_en',
    'short_name',
    'name_hi',
    'designation_order',
    'mapped_rank_code',
    'designation_type',
    'is_active',
])]
#[ObservedBy([AuditObserver::class])]
class Designation extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'designation_order' => 'integer',
        ];
    }

    public function rank(): BelongsTo
    {
        return $this->belongsTo(
            Rank::class,
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
        return $query->orderBy('designation_order');
    }
}
