import { Head, Link, setLayoutProps } from '@inertiajs/react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import Heading from '@/components/heading';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';

type ReportMeta = {
    key: string;
    name: string;
};

export default function ReportsIndex({ reports }: { reports: ReportMeta[] }) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Reports') }],
    });

    return (
        <>
            <Head title={t('Reports')} />

            <div className="px-4 py-6">
                <Heading
                    title={t('Reports')}
                    description={t('Select a report to view')}
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => (
                        <Link
                            key={report.key}
                            href={ReportController.show(report.key).url}
                        >
                            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {report.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {report.name}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
