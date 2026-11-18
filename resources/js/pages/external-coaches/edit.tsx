import { Head } from '@inertiajs/react';

import { update } from '@/actions/App/Http/Controllers/ExternalCoachController';
import { useTranslation } from '@/hooks/use-translation';
import { ExternalCoachForm } from './create';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    experience_years: number | null;
    city: string | null;
    remarks: string | null;
    photo_path: string | null;
    sport_ids: string[];
    training_venue_ids: string[];
    documents: { id: number; type: string; original_name: string }[];
};

type Props = {
    externalCoach: ExternalCoach;
    statuses: string[];
    sports: { id: number; name: string }[];
    trainingVenues: { id: number; name: string }[];
};

export default function ExternalCoachesEdit({
    externalCoach,
    statuses,
    sports,
    trainingVenues,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit external coach')} />
            <ExternalCoachForm
                title={t('Edit external coach')}
                description={t(
                    'Update login, contact, experience, and availability details.',
                )}
                action={update(externalCoach)}
                statuses={statuses}
                sports={sports}
                trainingVenues={trainingVenues}
                coach={externalCoach}
            />
        </>
    );
}
