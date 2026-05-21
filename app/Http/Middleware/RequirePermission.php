<?php

namespace App\Http\Middleware;

use App\Auth\Rbac;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    /**
     * Handle an incoming request.
     *
     * Accepts a pipe-delimited list of permission codes; passes if the
     * authenticated user holds **any** of them within their organisation.
     *
     * Usage: ->middleware('permission:members.view|members.create')
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $permissions): Response
    {
        $user = $request->user();

        if (! $user || ! $user->organization_id) {
            abort(403);
        }

        $orgId = (int) $user->organization_id;
        $rbac = app(Rbac::class);
        $codes = explode('|', $permissions);

        $hasAny = collect($codes)
            ->contains(fn (string $code) => $rbac->userHasPermission($user, $code, $orgId));

        if (! $hasAny) {
            abort(403);
        }

        return $next($request);
    }
}
