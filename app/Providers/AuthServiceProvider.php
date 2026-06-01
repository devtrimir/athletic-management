<?php

namespace App\Providers;

use App\Auth\Rbac;
use App\Models\MediaFile;
use App\Models\User;
use App\Policies\MediaPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(MediaFile::class, MediaPolicy::class);

        Gate::before(function (User $user, string $ability): ?bool {
            if (! $user->organization_id) {
                return null;
            }

            $rbac = app(Rbac::class);
            $orgId = (int) $user->organization_id;

            // Admin system-role short-circuit: every check passes.
            $isAdmin = $rbac->userRoles($user, $orgId)
                ->where('is_system', true)
                ->where('code', 'admin')
                ->isNotEmpty();

            if ($isAdmin) {
                return true;
            }

            // Delegate to Rbac permission check; return null (→ deny) if not granted.
            return $rbac->userHasPermission($user, $ability, $orgId) ? true : null;
        });
    }
}
