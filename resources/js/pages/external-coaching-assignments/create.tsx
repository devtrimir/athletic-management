import { Head } from '@inertiajs/react';

import { store } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import { useTranslation } from '@/hooks/use-translation';
import { AssignmentForm } from './form';

type Option = { id: number; name: string };
type CoachOption = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

export default function ExternalCoachingAssignmentsCreate({
    externalCoaches,
    trainingVenues,
    sports,
    statuses,
    attendanceModes,
}: {
    externalCoaches: CoachOption[];
    trainingVenues: Option[];
    sports: Option[];
    statuses: string[];
    attendanceModes: string[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create external coaching assignment')} />
            <AssignmentForm
                title={t('Create external coaching assignment')}
                description={t(
                    'Assign an active member to an external coach, venue, sport, and approved schedule.',
                )}
                action={store()}
                externalCoaches={externalCoaches}
                trainingVenues={trainingVenues}
                sports={sports}
                statuses={statuses}
                attendanceModes={attendanceModes}
            />
        </>
    );
}
