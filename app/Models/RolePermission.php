<?php

namespace App\Models;

use App\Auth\Rbac;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $table = 'role_permission';

    public $timestamps = false;

    public $incrementing = false;

    protected static function booted(): void
    {
        // When a role's permission set changes, invalidate every user who holds that role.
        $invalidate = static function (self $model): void {
            $rbac = app(Rbac::class);

            UserRole::where('role_id', $model->role_id)
                ->each(static function (UserRole $userRole) use ($rbac): void {
                    $rbac->invalidate((int) $userRole->user_id, (int) $userRole->organization_id);
                });
        };

        static::saved($invalidate);
        static::deleted($invalidate);
    }
}
