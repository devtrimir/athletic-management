import { Head } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';

export default function TrainingVenuesEdit() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit training venue')} />
            <div className="p-4 md:p-6">
                <h1 className="text-xl font-semibold tracking-tight">{t('Edit training venue')}</h1>
            </div>
        </>
    );
}
