<?php

namespace App\Auth;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class Rbac
{
    private const TTL = 3600;

    private const PREFIX = 'rbac';

    /** @var array<string, Collection> */
    private array $rolesCache = [];

    /** @var array<string, Collection> */
    private array $permissionsCache = [];

    /**
     * Return roles held by the user in the given org.
     *
     * @return Collection<int, Role>
     */
    public function userRoles(User $user, int $orgId): Collection
    {
        $key = "{$user->id}:{$orgId}";

        if (isset($this->rolesCache[$key])) {
            return $this->rolesCache[$key];
        }

        /** @var int[] $roleIds */
        $roleIds = Cache::remember(
            self::PREFIX.":roles:{$key}",
            self::TTL,
            fn (): array => Role::query()
                ->join('user_role', 'roles.id', '=', 'user_role.role_id')
                ->where('user_role.user_id', $user->id)
                ->where('roles.organization_id', $orgId)
                ->pluck('roles.id')
                ->all(),
        );

        return $this->rolesCache[$key] = Role::whereIn('id', $roleIds)->get();
    }

    /**
     * Return permission codes granted to the user in the given org.
     *
     * @return Collection<int, string>
     */
    public function userPermissions(User $user, int $orgId): Collection
    {
        $key = "{$user->id}:{$orgId}";

        if (isset($this->permissionsCache[$key])) {
            return $this->permissionsCache[$key];
        }

        $roleIds = $this->userRoles($user, $orgId)->pluck('id')->all();

        /** @var string[] $codes */
        $codes = Cache::remember(
            self::PREFIX.":permissions:{$key}",
            self::TTL,
            fn (): array => Permission::query()
                ->join('role_permission', 'permissions.id', '=', 'role_permission.permission_id')
                ->whereIn('role_permission.role_id', $roleIds)
                ->distinct()
                ->pluck('permissions.code')
                ->all(),
        );

        return $this->permissionsCache[$key] = collect($codes);
    }

    /**
     * Check whether the user holds a permission in the given org.
     *
     * When $orgId is null, the user's own organization_id is used.
     */
    public function userHasPermission(User $user, string $code, ?int $orgId = null): bool
    {
        $resolvedOrgId = $orgId ?? (int) $user->organization_id;

        if ($resolvedOrgId === 0) {
            return false;
        }

        return $this->userPermissions($user, $resolvedOrgId)->contains($code);
    }

    /**
     * Flush Redis and in-process cache for the user in the given org.
     */
    public function invalidate(int $userId, int $orgId): void
    {
        $key = "{$userId}:{$orgId}";

        Cache::forget(self::PREFIX.":roles:{$key}");
        Cache::forget(self::PREFIX.":permissions:{$key}");

        unset($this->rolesCache[$key], $this->permissionsCache[$key]);
    }
}
