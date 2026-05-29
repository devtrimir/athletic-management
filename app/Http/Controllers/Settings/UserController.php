<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUserRequest;
use App\Http\Requests\Settings\UpdateUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $orgId = (int) $request->user()->organization_id;

        $users = User::where('organization_id', $orgId)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'locale' => $u->locale,
                'is_active' => $u->is_active,
                'must_change_password' => $u->must_change_password,
                'created_at' => $u->created_at,
                'roles' => $u->roles($orgId)->map(fn (Role $r) => [
                    'id' => $r->id,
                    'code' => $r->code,
                    'name_hi' => $r->name_hi,
                    'name_en' => $r->name_en,
                ]),
            ]);

        return Inertia::render('settings/users/index', [
            'users' => $users,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', User::class);

        $orgId = (int) $request->user()->organization_id;

        $roles = Role::where('organization_id', $orgId)
            ->orderBy('name_en')
            ->get(['id', 'code', 'name_hi', 'name_en', 'is_system']);

        return Inertia::render('settings/users/create', [
            'roles' => $roles,
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        $data = $request->validated();
        $orgId = (int) $request->user()->organization_id;

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'organization_id' => $orgId,
            'locale' => $data['locale'],
            'is_active' => true,
            'must_change_password' => true,
        ]);

        if (! empty($data['roles'])) {
            $roles = Role::whereIn('id', $data['roles'])
                ->where('organization_id', $orgId)
                ->get();

            foreach ($roles as $role) {
                $user->assignRole($role, $orgId, $request->user());
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created.')]);

        return to_route('users.index');
    }

    public function edit(User $user, Request $request): Response
    {
        Gate::authorize('update', $user);

        $orgId = (int) $request->user()->organization_id;
        $roles = Role::where('organization_id', $orgId)
            ->orderBy('name_en')
            ->get(['id', 'code', 'name_hi', 'name_en', 'is_system']);
        $roleIds = $user->roles($orgId)->pluck('id')->values();

        return Inertia::render('settings/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'locale' => $user->locale,
                'is_active' => $user->is_active,
                'must_change_password' => $user->must_change_password,
                'role_ids' => $roleIds,
            ],
            'roles' => $roles,
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        $data = $request->validated();
        $updateData = [
            'name' => $data['name'],
            'email' => $data['email'],
            'locale' => $data['locale'],
            'is_active' => $data['is_active'],
        ];

        if (! empty($data['password'])) {
            $updateData['password'] = $data['password'];
            $updateData['must_change_password'] = true;
        }

        $user->update($updateData);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated.')]);

        return to_route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted.')]);

        return to_route('users.index');
    }

    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('updateRoles', $user);

        $request->validate([
            'roles' => ['present', 'array'],
            'roles.*' => ['integer'],
        ]);

        $orgId = (int) $request->user()->organization_id;
        $newRoleIds = array_map('intval', $request->input('roles', []));

        $validRoleIds = Role::whereIn('id', $newRoleIds)
            ->where('organization_id', $orgId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $currentRoleIds = UserRole::where('user_id', $user->id)
            ->where('organization_id', $orgId)
            ->pluck('role_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach (array_diff($currentRoleIds, $validRoleIds) as $roleId) {
            $user->revokeRole($roleId, $orgId);
        }

        foreach (array_diff($validRoleIds, $currentRoleIds) as $roleId) {
            $user->assignRole($roleId, $orgId, $request->user());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Roles updated.')]);

        return to_route('users.edit', $user);
    }
}
