import { createInertiaApp } from '@inertiajs/react';
import { configureEcho, echo } from '@laravel/echo-react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ExternalCoachLayout from '@/layouts/external-coach-layout';
import SettingsLayout from '@/layouts/settings/layout';

configureEcho({
    broadcaster: 'reverb',
});

// Temporary Echo diagnostics for the member-import websocket issue — remove
// once resolved.
if (typeof window !== 'undefined') {
    console.log('[echo] reverb config', {
        key: import.meta.env.VITE_REVERB_APP_KEY,
        host: import.meta.env.VITE_REVERB_HOST,
        port: import.meta.env.VITE_REVERB_PORT,
        scheme: import.meta.env.VITE_REVERB_SCHEME,
    });

    type PusherLike = {
        connection: {
            bind: (event: string, cb: (data: unknown) => void) => void;
        };
        bind_global: (cb: (event: string, data: unknown) => void) => void;
    };
    const pusher = (
        echo<'reverb'>().connector as unknown as { pusher: PusherLike }
    ).pusher;

    pusher.connection.bind('state_change', (states) => {
        console.log(
            '[echo] connection state →',
            (states as { current: string }).current,
        );
    });
    pusher.connection.bind('error', (error: unknown) => {
        console.error('[echo] connection error', error);
    });
    pusher.bind_global((event, data) => {
        if (event.startsWith('pusher')) {
            console.log('[echo]', event, data);
        }
    });
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name === 'reports/medals/print':
                return null;
            case name === 'members/print':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('external-coach/auth/'):
                return AuthLayout;
            case name.startsWith('external-coach/'):
                return ExternalCoachLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
