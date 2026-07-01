import { Head } from '@inertiajs/react';

import { update } from '@/actions/App/Http/Controllers/TrainingVenueController';
import { useTranslation } from '@/hooks/use-translation';
import { TrainingVenueForm } from './form';
import type { TrainingVenue } from './form';

export default function TrainingVenuesEdit({
    trainingVenue,
    statuses,
}: {
    trainingVenue: TrainingVenue;
    statuses: string[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit training venue')} />
            <TrainingVenueForm
                title={t('Edit training venue')}
                description={t(
                    'Update venue location, attendance radius, and availability.',
                )}
                action={update(trainingVenue)}
                venue={trainingVenue}
                statuses={statuses}
            />
        </>
    );
}
