<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExternalCoaches\LoginExternalCoachRequest;
use App\Models\ExternalCoach;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExternalCoachLoginController extends Controller
{
    /**
     * Sign-in happens inline on the welcome page; this route just points there.
     */
    public function create(): RedirectResponse
    {
        return redirect()->route('home', ['panel' => 'coach']);
    }

    public function store(LoginExternalCoachRequest $request): RedirectResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);
        $throttleKey = 'external-coach-login:'.Str::lower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            abort(429, __('Too many login attempts. Please try again in :seconds seconds.', [
                'seconds' => RateLimiter::availableIn($throttleKey),
            ]));
        }

        // Check the password first so a wrong guess never reveals whether the
        // account exists or is inactive.
        if (! Auth::guard('external_coach')->attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        /** @var ExternalCoach $coach */
        $coach = Auth::guard('external_coach')->user();

        if (! $coach->isActiveForLogin()) {
            Auth::guard('external_coach')->logout();

            throw ValidationException::withMessages([
                'email' => __('Your coach account is inactive. Please contact the administrator.'),
            ]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();
        $coach->forceFill(['last_login_at' => now()])->save();

        // Only honour a remembered URL inside the coach portal on this host; a
        // stale admin URL or an off-site address must never decide where we go.
        $intended = (string) $request->session()->pull('url.intended', '');
        $parts = parse_url($intended) ?: [];
        $path = (string) ($parts['path'] ?? '');
        $sameHost = ! isset($parts['host']) || $parts['host'] === $request->getHost();

        return redirect()->to(
            $sameHost && str_starts_with($path, '/external-coach') && ! str_starts_with($path, '/external-coach/login')
                ? $intended
                : route('external-coach.dashboard'),
        );
    }

    public function destroy(): RedirectResponse
    {
        Auth::guard('external_coach')->logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return to_route('external-coach.login');
    }
}
