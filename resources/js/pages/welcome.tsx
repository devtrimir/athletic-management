import { Head, Link, usePage } from '@inertiajs/react';
import { Medal, Trophy, Users, UserCheck, Dumbbell, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;
    const { t } = useTranslation();

    const features = [
        {
            icon: Users,
            title: t('Athlete Management'),
            description: t('Track athlete profiles, service history, and sports performance.'),
        },
        {
            icon: UserCheck,
            title: t('Coach Management'),
            description: t('Maintain coach rosters, specialisations, and assignments.'),
        },
        {
            icon: Dumbbell,
            title: t('Team Management'),
            description: t('Organise police unit sport teams across sports and sessions.'),
        },
        {
            icon: Trophy,
            title: t('Tournament Records'),
            description: t('Record tournament results, tiers, and events.'),
        },
        {
            icon: Medal,
            title: t('Medal & Achievement Tracking'),
            description: t('Keep a permanent record of gold, silver, and bronze medals.'),
        },
        {
            icon: ShieldCheck,
            title: t('Secure & Role-Based'),
            description: t('RBAC-enforced access so every user sees only what they need.'),
        },
    ];

    return (
        <>
            <Head title={t('UP Police Sports Management System')} />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                {/* Top nav */}
                <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">
                                {t('Uttar Pradesh Police — Sports Unit')}
                            </span>
                        </div>
                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Button asChild size="sm">
                                    <Link href={dashboard()}>{t('Go to Dashboard')}</Link>
                                </Button>
                            ) : (
                                <Button asChild size="sm">
                                    <Link href={login()}>{t('Log in')}</Link>
                                </Button>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero */}
                <main className="flex flex-1 flex-col">
                    <section className="mx-auto w-full max-w-5xl px-6 py-20 text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {t('Replacing legacy Excel workbooks with a modern, searchable system.')}
                        </div>
                        <h1 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">
                            {t('UP Police Sports Management System')}
                        </h1>
                        <p className="mt-2 text-lg font-medium text-muted-foreground">
                            यूपी पुलिस खेल प्रबंधन प्रणाली
                        </p>
                        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
                            {t('Manage athletes, coaches, teams, and tournaments in one place.')}
                        </p>
                        <div className="mt-8 flex justify-center">
                            {auth.user ? (
                                <Button asChild size="lg">
                                    <Link href={dashboard()}>{t('Go to Dashboard')}</Link>
                                </Button>
                            ) : (
                                <Button asChild size="lg">
                                    <Link href={login()}>{t('Log in to continue')}</Link>
                                </Button>
                            )}
                        </div>
                    </section>

                    {/* Feature grid */}
                    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                                >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        {description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
                    {t('Uttar Pradesh Police — Sports Unit')}
                </footer>
            </div>
        </>
    );
}

