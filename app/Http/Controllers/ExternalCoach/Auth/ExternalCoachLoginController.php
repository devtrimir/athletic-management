<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExternalCoaches\LoginExternalCoachRequest;
use App\Models\ExternalCoach;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExternalCoachLoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('external-coach/auth/login');
    }

    public function store(LoginExternalCoachRequest $request): RedirectResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);
        $coach = ExternalCoach::query()->where('email', $credentials['email'])->first();

        if (! $coach?->isActiveForLogin()) {
            throw ValidationException::withMessages([
                'email' => __('Your coach account is inactive. Please contact the administrator.'),
            ]);
        }

        if (! Auth::guard('external_coach')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        $request->session()->regenerate();
        $coach->forceFill(['last_login_at' => now()])->save();

        return redirect()->intended(route('external-coach.dashboard'));
    }

    public function destroy(): RedirectResponse
    {
        Auth::guard('external_coach')->logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return to_route('external-coach.login');
    }
}
