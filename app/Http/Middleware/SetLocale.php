<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /** Locales supported by the application. */
    private const ALLOWED = ['hi', 'en'];

    /**
     * Handle an incoming request.
     *
     * Priority:
     *  1. Authenticated user's stored locale (users.locale)
     *  2. Guest session locale (set via LocaleController)
     *  3. Default 'hi'
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->user()?->locale
            ?? session('locale')
            ?? 'hi';

        if (! in_array($locale, self::ALLOWED, strict: true)) {
            $locale = 'hi';
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
