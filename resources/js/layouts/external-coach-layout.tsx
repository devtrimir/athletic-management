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
        <div className="min-h-screen bg-muted/20">
            <header className="border-b bg-background/95">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
                    <Link
                        href="/external-coach/dashboard"
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {t('External coach portal')}
                    </Link>

                    <AppearanceToggleTab className="bg-transparent p-0 text-xs" />
                </div>
            </header>

            {children}
        </div>
    );
}
