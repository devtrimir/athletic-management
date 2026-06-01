<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Auth\Rbac;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreRoleRequest;
use App\Http\Requests\Settings\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Role::class);

        $orgId = (int) $request->user()->organization_id;

        $roles = Role::where('organization_id', $orgId)
            ->withCount(['permissions'])
            ->orderBy('name_en')
            ->get()
            ->map(fn (Role $r) => [
                'id' => $r->id,
                'code' => $r->code,
                'name_hi' => $r->name_hi,
                'name_en' => $r->name_en,
                'is_system' => $r->is_system,
                'permissions_count' => $r->permissions_count,
                'user_count' => UserRole::where('role_id', $r->id)->where('organization_id', $orgId)->count(),
            ]);

        return Inertia::render('settings/roles/index', [
            'roles' => $roles,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Role::class);

        return Inertia::render('settings/roles/create');
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        Gate::authorize('create', Role::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        Role::create(array_merge($data, [
            'organization_id' => $orgId,
            'is_system' => false,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role created.')]);

        return to_route('roles.index');
    }

    public function show(Role $role, Request $request): Response
    {
        Gate::authorize('view', $role);

        $orgId = (int) $request->user()->organization_id;

        $allPermissions = Permission::orderBy('group')->orderBy('name_en')->get();
        $rolePermIds = $role->permissions()->pluck('permissions.id')->map(fn ($id) => (int) $id)->all();

        return Inertia::render('settings/roles/show', [
            'role' => [
                'id' => $role->id,
                'code' => $role->code,
                'name_hi' => $role->name_hi,
                'name_en' => $role->name_en,
                'is_system' => $role->is_system,
            ],
            'permissions' => $allPermissions,
            'role_permission_ids' => $rolePermIds,
            'user_count' => UserRole::where('role_id', $role->id)->where('organization_id', $orgId)->count(),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        Gate::authorize('update', $role);

        $role->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role updated.')]);

        return to_route('roles.show', $role);
    }

    public function destroy(Role $role): RedirectResponse
    {
        Gate::authorize('delete', $role);

        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role deleted.')]);

        return to_route('roles.index');
    }

    public function updatePermissions(Request $request, Role $role, Rbac $rbac): RedirectResponse
    {
        Gate::authorize('updatePermissions', $role);

        $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        // The admin role always holds every permission — ignore the submitted set.
        $permissionIds = $role->code === 'admin'
            ? Permission::pluck('id')->map(fn ($id) => (int) $id)->all()
            : array_map('intval', $request->input('permissions', []));

        $role->permissions()->sync($permissionIds);

        // Invalidate RBAC cache for all users who hold this role.
        $orgId = (int) $request->user()->organization_id;
        UserRole::where('role_id', $role->id)
            ->where('organization_id', $orgId)
            ->pluck('user_id')
            ->each(fn (int $userId) => $rbac->invalidate($userId, $orgId));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Permissions updated.')]);

        return to_route('roles.show', $role);
    }
}
