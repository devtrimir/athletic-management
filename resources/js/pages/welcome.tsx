import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, login } from '@/routes';
import externalCoach from '@/routes/external-coach';

export default function Welcome() {
    const { auth } = usePage().props;
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('UP Police Sports Management System')} />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b border-border/70 bg-background">
                    <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.jpg"
                                alt="UP Police Sports"
                                className="h-9 w-9 shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold tracking-tight">
                                    {t('Uttar Pradesh Police')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('Sports Unit')}
                                </p>
                            </div>
                        </div>
                        <nav className="hidden gap-2 sm:flex sm:items-center">
                            {auth.user ? (
                                <Button asChild size="sm">
                                    <Link href={dashboard()}>
                                        {t('Dashboard')}
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={externalCoach.login()}>
                                            {t('External coach login')}
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href={login()}>
                                            {t('Log in')}
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="flex flex-1 items-center">
                    <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_320px] lg:items-center lg:py-20">
                        <div className="max-w-2xl">
                            <img
                                src="/logo.jpg"
                                alt="UP Police Sports"
                                className="mb-8 h-16 w-16"
                            />
                            <p className="mb-3 text-sm font-medium text-muted-foreground">
                                {t('UP Police Sports Unit')}
                            </p>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                {t(
                                    'Sports records, teams, and performance in one secure system.',
                                )}
                            </h1>
                            <p className="mt-3 text-base text-muted-foreground">
                                यूपी पुलिस खेल प्रबंधन प्रणाली
                            </p>
                            <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                                {t(
                                    'Use this portal to manage members, coaches, teams, tournaments, attendance, and reports.',
                                )}
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                            <div className="mb-5 flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <LockKeyhole className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold">
                                        {t('Access portal')}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {auth.user
                                            ? t('Continue to your workspace.')
                                            : t(
                                                  'Choose the sign-in area for your role.',
                                              )}
                                    </p>
                                </div>
                            </div>

                            {auth.user ? (
                                <Button asChild className="w-full" size="lg">
                                    <Link href={dashboard()}>
                                        {t('Go to Dashboard')}
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <div className="grid gap-3">
                                    <Button
                                        asChild
                                        className="w-full"
                                        size="lg"
                                    >
                                        <Link href={login()}>
                                            {t('Log in to continue')}
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="w-full"
                                        size="lg"
                                        variant="outline"
                                    >
                                        <Link href={externalCoach.login()}>
                                            {t('External coach login')}
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="border-t border-border/70 px-4 py-4 text-center text-xs text-muted-foreground">
                    {t('Uttar Pradesh Police')} · {t('Sports Unit')}
                </footer>
            </div>
        </>
    );
}
