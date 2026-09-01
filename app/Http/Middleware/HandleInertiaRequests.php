<?php

namespace App\Http\Middleware;

use App\Auth\Rbac;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'permissions' => fn (): array => $user instanceof User && $user->organization_id
                    ? app(Rbac::class)->userPermissions($user, $user->organization_id)->all()
                    : [],
            ],
            'locale' => fn (): string => app()->getLocale(),
            'translations' => fn (): array => $this->loadTranslations(),
            'flash' => fn (): array => [
                'toast' => $request->session()->get('flash.toast'),
                'import_result' => $request->session()->get('import_result'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Load translation strings for the current locale from resources/lang/{locale}.json.
     *
     * @return array<string, string>
     */
    private function loadTranslations(): array
    {
        $locale = app()->getLocale();
        $path = lang_path("{$locale}.json");

        if (! file_exists($path)) {
            return [];
        }

        return json_decode((string) file_get_contents($path), true) ?? [];
    }
}
