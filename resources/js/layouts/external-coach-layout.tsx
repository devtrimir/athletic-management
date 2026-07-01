import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import AppearanceToggleTab from '@/components/appearance-tabs';
import { useTranslation } from '@/hooks/use-translation';

export default function ExternalCoachLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div
            data-external-coach-layout
            className="min-h-screen w-full max-w-full overflow-x-hidden bg-muted/20"
        >
            <header className="border-b bg-background/95">
                <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-6">
                    <Link
                        href="/external-coach/dashboard"
                        className="min-w-0 truncate text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {t('External coach portal')}
                    </Link>

                    <AppearanceToggleTab className="shrink-0 bg-transparent p-0 text-xs" />
                </div>
            </header>

            <div className="w-full max-w-full overflow-x-hidden">
                {children}
            </div>
        </div>
    );
}
