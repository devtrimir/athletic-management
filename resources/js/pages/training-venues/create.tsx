import { Head } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';

export default function TrainingVenuesCreate() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create training venue')} />
            <div className="p-4 md:p-6">
                <h1 className="text-xl font-semibold tracking-tight">{t('Create training venue')}</h1>
            </div>
        </>
    );
}
