<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\SportSessionFactory;
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
 * @property int $start_year
 * @property int $end_year
 * @property bool $is_current
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'name', 'start_year', 'end_year', 'is_current'])]
#[ObservedBy([AuditObserver::class])]
class SportSession extends Model
{
    /** @use HasFactory<SportSessionFactory> */
    use Auditable, HasFactory;

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
