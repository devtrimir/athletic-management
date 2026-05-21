<?php

namespace App\Concerns;

use App\Auth\Rbac;
use App\Models\Organization;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Support\Collection;

/**
 * Convenience wrappers around the Rbac service for use on the User model.
 *
 * @property int|null $organization_id
 */
trait HasRoles
{
    /**
     * Return roles held by this user in the given org.
     *
     * @return Collection<int, Role>
     */
    public function roles(int $orgId): Collection
    {
        return app(Rbac::class)->userRoles($this, $orgId);
    }

    /**
     * Return permission codes held by this user in the given org.
     *
     * @return Collection<int, string>
     */
    public function permissions(int $orgId): Collection
    {
        return app(Rbac::class)->userPermissions($this, $orgId);
    }

    public function hasRole(string $code, int $orgId): bool
    {
        return $this->roles($orgId)->contains('code', $code);
    }

    /** @param string[] $codes */
    public function hasAnyRole(array $codes, int $orgId): bool
    {
        return $this->roles($orgId)->whereIn('code', $codes)->isNotEmpty();
    }

    public function assignRole(Role|int $role, Organization|int $org, ?self $assignedBy = null): void
    {
        $roleId = $role instanceof Role ? $role->id : $role;
        $orgId = $org instanceof Organization ? $org->id : $org;

        UserRole::firstOrCreate(
            [
                'user_id' => $this->id,
                'role_id' => $roleId,
                'organization_id' => $orgId,
            ],
            [
                'assigned_by' => $assignedBy?->id,
            ],
        );
    }

    public function revokeRole(Role|int $role, Organization|int $org): void
    {
        $roleId = $role instanceof Role ? $role->id : $role;
        $orgId = $org instanceof Organization ? $org->id : $org;

        UserRole::where('user_id', $this->id)
            ->where('role_id', $roleId)
            ->where('organization_id', $orgId)
            ->delete();

        // Composite-key pivot has no Eloquent delete event; invalidate manually.
        app(Rbac::class)->invalidate((int) $this->id, $orgId);
    }
}
