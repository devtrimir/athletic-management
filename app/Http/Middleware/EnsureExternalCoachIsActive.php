<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureExternalCoachIsActive
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $coach = Auth::guard('external_coach')->user();

        if ($coach?->isActiveForLogin()) {
            return $next($request);
        }

        Auth::guard('external_coach')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('external-coach.login')
            ->withErrors(['email' => __('Your coach account is inactive. Please contact the administrator.')]);
    }
}
