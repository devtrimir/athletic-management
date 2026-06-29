import { Head } from '@inertiajs/react';

import { update } from '@/actions/App/Http/Controllers/SportsCalendarController';
import { useTranslation } from '@/hooks/use-translation';
import { SportsCalendarForm } from './form';
import type { SportsCalendar } from './form';

export default function SportsCalendarsEdit({
    calendar,
    years,
}: {
    calendar: SportsCalendar;
    years: (string | number)[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Edit sports calendar')} />
            <SportsCalendarForm
                title={t('Edit sports calendar')}
                description={t('Update competition details and report status for the 2026 calendar.')}
                action={update(calendar)}
                years={years}
                calendar={calendar}
            />
        </>
    );
}
