<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    /**
     * Handle an incoming request.
     *
     * Accepts a pipe-delimited list of role codes; passes if the authenticated
     * user holds **any** of them within their organisation.
     *
     * Usage: ->middleware('role:admin|data_entry')
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->organization_id) {
            abort(403);
        }

        $codes = explode('|', $roles);

        if (! $user->hasAnyRole($codes, (int) $user->organization_id)) {
            abort(403);
        }

        return $next($request);
    }
}
