import { Head } from '@inertiajs/react';

import { store } from '@/actions/App/Http/Controllers/SportsCalendarController';
import { useTranslation } from '@/hooks/use-translation';
import { SportsCalendarForm } from './form';

export default function SportsCalendarsCreate({
    years,
}: {
    years: (string | number)[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create sports calendar')} />
            <SportsCalendarForm
                title={t('Create sports calendar')}
                description={t(
                    'Create a yearly sports calendar row with competition and venue details.',
                )}
                action={store()}
                years={years}
            />
        </>
    );
}
