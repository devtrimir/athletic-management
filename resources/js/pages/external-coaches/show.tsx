import { Head, Link } from '@inertiajs/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    city: string | null;
    experience_years: number | null;
    remarks: string | null;
    status_history?: Array<{
        id: number;
        status: string;
        reason: string | null;
        recorded_at: string;
        recorded_by?: { name: string } | null;
    }>;
};

type Props = {
    externalCoach: ExternalCoach;
};

export default function ExternalCoachesShow({ externalCoach }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={externalCoach.name} />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {externalCoach.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {externalCoach.email}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href="/external-coaches">{t('Back')}</Link>
                        </Button>
                        <Button asChild>
                            <Link
                                href={`/external-coaches/${externalCoach.id}/edit`}
                            >
                                {t('Edit')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <section className="rounded-lg border bg-card p-5">
                    <div className="mb-4">
                        <Badge variant="outline">
                            {t(externalCoach.status)}
                        </Badge>
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <dt className="text-muted-foreground">
                                {t('Phone')}
                            </dt>
                            <dd>{externalCoach.phone ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                {t('City')}
                            </dt>
                            <dd>{externalCoach.city ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                {t('Experience')}
                            </dt>
                            <dd>{externalCoach.experience_years ?? '-'}</dd>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <dt className="text-muted-foreground">
                                {t('Remarks')}
                            </dt>
                            <dd>{externalCoach.remarks ?? '-'}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </>
    );
}
