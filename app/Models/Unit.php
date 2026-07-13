<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\UnitFactory;
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
 * @property string $unit_type
 * @property string|null $commandant
 * @property int|null $district_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'name', 'name_en', 'unit_type', 'commandant', 'district_id'])]
#[ObservedBy([AuditObserver::class])]
class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use Auditable, HasFactory, Tenanted;

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}
