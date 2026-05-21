<?php

namespace App\Models;

use App\Auth\Rbac;
use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    protected $table = 'user_role';

    protected static function booted(): void
    {
        $invalidate = static function (self $model): void {
            app(Rbac::class)->invalidate((int) $model->user_id, (int) $model->organization_id);
        };

        static::saved($invalidate);
        static::deleted($invalidate);
    }
}
