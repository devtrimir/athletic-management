import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { InchargeForm } from './form';
import type { InchargeFormRecord, MasterOption } from './form';

export default function InchargesEdit({
    incharge,
    ranks,
    designations,
}: {
    incharge: InchargeFormRecord & { id: number };
    ranks: MasterOption[];
    designations: MasterOption[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit team prabhari')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={t('Edit team prabhari')}
                        description={t('Update this team prabhari profile.')}
                    />
                    <Button asChild variant="outline">
                        <Link href={InchargeController.show.url(incharge.id)}>
                            <ArrowLeft className="size-4" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>
                <InchargeForm
                    incharge={incharge}
                    ranks={ranks}
                    designations={designations}
                />
            </div>
        </>
    );
}

InchargesEdit.layout = {
    breadcrumbs: [
        { title: 'Team Prabhari', href: InchargeController.index.url() },
    ],
};
