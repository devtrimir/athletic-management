<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // Horizon::routeSmsNotificationsTo('15556667777');
        // Horizon::routeMailNotificationsTo('example@example.com');
        // Horizon::routeSlackNotificationsTo('slack-webhook-url', '#channel');
    }

    /**
     * Register the Horizon gate.
     *
     * This gate determines who can access Horizon in non-local environments.
     *
     * TODO P1-T03: Replace with a real RBAC permission check once the
     * Permission model and in-house RBAC system are in place (P1).
     * Until then, Horizon is only accessible in the `local` environment;
     * all production/staging access is denied here.
     */
    protected function gate(): void
    {
        Gate::define('viewHorizon', function ($user = null) {
            return false;
        });
    }
}
