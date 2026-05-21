<?php

namespace App\Models;

use App\Auth\Rbac;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'role_id', 'organization_id', 'assigned_by'])]
class UserRole extends Model
{
    protected $table = 'user_role';

    public $timestamps = false;

    protected static function booted(): void
    {
        static::saved(static function (self $model): void {
            app(Rbac::class)->invalidate((int) $model->user_id, (int) $model->organization_id);
        });
    }
}
