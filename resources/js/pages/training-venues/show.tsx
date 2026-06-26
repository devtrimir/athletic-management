import { Head } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';

export default function TrainingVenuesShow() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Training venue')} />
            <div className="p-4 md:p-6">
                <h1 className="text-xl font-semibold tracking-tight">{t('Training venue')}</h1>
            </div>
        </>
    );
}
