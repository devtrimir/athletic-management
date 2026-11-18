<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $display_name_en
 * @property string|null $display_name_hi
 * @property string $code
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['name', 'code', 'display_name_en', 'display_name_hi'])]
#[ObservedBy([AuditObserver::class])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use Auditable, HasFactory;

    /** @return HasMany<Incharge, $this> */
    public function incharges(): HasMany
    {
        return $this->hasMany(Incharge::class);
    }
}
