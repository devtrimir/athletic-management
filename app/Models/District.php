<?php

namespace App\Models;

use Database\Factories\DistrictFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name_hi
 * @property string $name_en
 * @property string $state
 * @property string $code
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['name_hi', 'name_en', 'state', 'code'])]
class District extends Model
{
    /** @use HasFactory<DistrictFactory> */
    use HasFactory;
}
