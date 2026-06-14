<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Observers\AuditObserver;
use Database\Factories\DistrictFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $state
 * @property string $code
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['name', 'state', 'code'])]
#[ObservedBy([AuditObserver::class])]
class District extends Model
{
    /** @use HasFactory<DistrictFactory> */
    use Auditable, HasFactory;
}
