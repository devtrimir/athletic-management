import { Form, Head } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export default function ExternalCoachDashboard() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External coach dashboard')} />

            <main className="min-h-screen bg-background">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
                    <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('External coach dashboard')}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('Assigned athletes and attendance tools will appear here.')}
                            </p>
                        </div>

                        <Form action="/external-coach/logout" method="post">
                            {({ processing }) => (
                                <Button type="submit" variant="outline" disabled={processing}>
                                    {t('Log out')}
                                </Button>
                            )}
                        </Form>
                    </header>

                    <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                        {t('No external training assignments are available yet.')}
                    </section>
                </div>
            </main>
        </>
    );
}
