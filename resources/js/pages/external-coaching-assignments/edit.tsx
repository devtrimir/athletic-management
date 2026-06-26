import { Head } from '@inertiajs/react';

import { update } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import { useTranslation } from '@/hooks/use-translation';
import { AssignmentForm } from './form';
import type { Assignment } from './form';

type Option = { id: number; name: string };
type CoachOption = { id: number; name: string; email: string | null; phone: string | null };

export default function ExternalCoachingAssignmentsEdit({
    assignment,
    externalCoaches,
    trainingVenues,
    sports,
    statuses,
    attendanceModes,
}: {
    assignment: Assignment;
    externalCoaches: CoachOption[];
    trainingVenues: Option[];
    sports: Option[];
    statuses: string[];
    attendanceModes: string[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit external coaching assignment')} />
            <AssignmentForm
                title={t('Edit external coaching assignment')}
                description={t('Update the coach, venue, approval status, and training schedule.')}
                action={update(assignment)}
                assignment={assignment}
                externalCoaches={externalCoaches}
                trainingVenues={trainingVenues}
                sports={sports}
                statuses={statuses}
                attendanceModes={attendanceModes}
            />
        </>
    );
}
