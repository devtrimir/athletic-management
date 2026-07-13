<?php

declare(strict_types=1);

namespace App\Models;

use App\Observers\AuditObserver;
use Database\Factories\NisMasterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'kind',
    'code',
    'name',
    'name_en',
    'short_name',
    'sort_order',
    'is_active',
    'metadata',
])]
#[ObservedBy([AuditObserver::class])]
class NisMaster extends Model
{
    /** @use HasFactory<NisMasterFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}
