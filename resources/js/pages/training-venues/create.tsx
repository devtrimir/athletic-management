import { Head } from '@inertiajs/react';

import { store } from '@/actions/App/Http/Controllers/TrainingVenueController';
import { useTranslation } from '@/hooks/use-translation';
import { TrainingVenueForm } from './form';

export default function TrainingVenuesCreate({
    statuses,
}: {
    statuses: string[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create training venue')} />
            <TrainingVenueForm
                title={t('Create training venue')}
                description={t('Register a venue that external coaches can use for verified training.')}
                action={store()}
                statuses={statuses}
            />
        </>
    );
}
