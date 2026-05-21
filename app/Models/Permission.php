<?php

namespace App\Models;

use Database\Factories\PermissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $group
 * @property string $name_hi
 * @property string $name_en
 * @property string|null $description
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['code', 'group', 'name_hi', 'name_en', 'description'])]
class Permission extends Model
{
    /** @use HasFactory<PermissionFactory> */
    use HasFactory;
}
