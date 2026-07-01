import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { InchargeForm } from './form';
import type { MasterOption } from './form';

export default function InchargesCreate({
    ranks,
    designations,
}: {
    ranks: MasterOption[];
    designations: MasterOption[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Add team prabhari')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={t('Add team prabhari')}
                        description={t(
                            'Create a compact team prabhari profile.',
                        )}
                    />
                    <Button asChild variant="outline">
                        <Link href={InchargeController.index.url()}>
                            <ArrowLeft className="size-4" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>
                <InchargeForm ranks={ranks} designations={designations} />
            </div>
        </>
    );
}

InchargesCreate.layout = {
    breadcrumbs: [
        { title: 'Team Prabhari', href: InchargeController.index.url() },
    ],
};
