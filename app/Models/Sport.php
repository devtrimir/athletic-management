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
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string $category
 * @property string $slug
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'name', 'category', 'slug'])]
#[ObservedBy([AuditObserver::class])]
class Sport extends Model
{
    /** @use HasFactory<SportFactory> */
    use Auditable, HasFactory, Tenanted;

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
