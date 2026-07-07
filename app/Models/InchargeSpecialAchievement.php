<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

#[Fillable([
    'organization_id',
    'incharge_id',
    'achievement_type',
    'title',
    'awarded_on',
    'issuing_authority',
    'order_reference',
    'order_document_path',
    'order_document_original_name',
    'order_document_mime_type',
    'order_document_size_bytes',
    'place',
    'remarks',
])]
#[ObservedBy([AuditObserver::class])]
class InchargeSpecialAchievement extends Model
{
    use Auditable, HasFactory, Tenanted;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'awarded_on' => 'date',
            'order_document_size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<Incharge, $this> */
    public function incharge(): BelongsTo
    {
        return $this->belongsTo(Incharge::class);
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
