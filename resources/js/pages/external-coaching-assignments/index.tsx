import { Head } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';

export default function ExternalCoachingAssignmentsIndex() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External coaching assignments')} />
            <div className="p-4 md:p-6">
                <h1 className="text-xl font-semibold tracking-tight">
                    {t('External coaching assignments')}
                </h1>
            </div>
        </>
    );
}
