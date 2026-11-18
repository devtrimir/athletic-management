import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';
import { attendanceModeLabel, translateValue } from '@/lib/external-coaching';

type Assignment = {
    id: number;
    member: string | null;
    pno: string | null;
    external_coach: string | null;
    venue: string | null;
    sport: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    attendance_mode: string | null;
};

type Filters = {
    status: string | null;
    memberQuery: string | null;
    coachQuery: string | null;
    startDateFrom: string | null;
    startDateTo: string | null;
};

const COLUMNS: PrintColumn<Assignment>[] = [
    {
        key: 'member',
        weight: 2.4,

        label: 'Member',
        cell: (a) => (
            <>
                <strong>{a.member ?? '-'}</strong>
                {a.pno && <div className="muted">{a.pno}</div>}
            </>
        ),
    },
    {
        key: 'coach',
        weight: 2,

        label: 'Coach',
        cell: (a) => a.external_coach ?? '-',
    },
    {
        key: 'venue',
        weight: 2.4,

        label: 'Venue',
        cell: (a) => a.venue ?? '-',
    },
    {
        key: 'sport',
        weight: 1.6,

        label: 'Sport',
        cell: (a) => a.sport ?? '-',
    },
    {
        key: 'start',
        weight: 1.1,
        label: 'Start',
        cell: (a) => formatDate(a.start_date, '-'),
    },
    {
        key: 'end',
        weight: 1.1,
        label: 'End',
        cell: (a) => formatDate(a.end_date, '-'),
    },
    {
        key: 'mode',
        weight: 1.2,
        label: 'Attendance mode',
        optional: true,
        cell: (a, t) => attendanceModeLabel(a.attendance_mode, t),
    },
    {
        key: 'status',
        weight: 1,
        label: 'Status',
        cell: (a, t) => translateValue(a.status, t),
    },
];

export default function ExternalCoachingAssignmentsPrint({
    assignments,
    filters,
    sportName,
    printedAt,
}: {
    assignments: Assignment[];
    filters: Filters;
    sportName: string | null;
    printedAt: string;
}) {
    const { t } = useTranslation();
    const title = t('External coaching assignments');

    return (
        <>
            <Head title={title} />
            <ColumnsPrint
                title={title}
                printedAt={printedAt}
                info={[
                    filters.status
                        ? `${t('Status')}: ${t(filters.status)}`
                        : null,
                    sportName ? `${t('Sport')}: ${sportName}` : null,
                    filters.memberQuery
                        ? `${t('Member')}: ${filters.memberQuery}`
                        : null,
                    filters.coachQuery
                        ? `${t('Coach')}: ${filters.coachQuery}`
                        : null,
                    filters.startDateFrom || filters.startDateTo
                        ? `${t('Start date')}: ${formatDate(filters.startDateFrom, '…')} – ${formatDate(filters.startDateTo, '…')}`
                        : null,
                ]}
                rows={assignments}
                columns={COLUMNS}
                emptyText={t('No external coaching assignments found.')}
            />
        </>
    );
}
