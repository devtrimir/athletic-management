import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';

type Attendance = {
    id: number;
    date: string | null;
    member: string | null;
    pno: string | null;
    external_coach: string | null;
    venue: string | null;
    sport: string | null;
    attendance_status: string;
    corrected_status: string | null;
    geo_status: string;
    review_status: string;
    distance_meters: string | null;
    reviewed_by: string | null;
    coach_remarks: string | null;
};

type Filters = {
    q: string | null;
    date_from: string | null;
    date_to: string | null;
    attendance_status: string | null;
    geo_status: string | null;
    review_status: string | null;
    selected: number;
};

const REVIEW_LABELS: Record<string, string> = {
    pending: 'Pending review',
    approved: 'Approved',
    corrected: 'Corrected',
    rejected: 'Rejected',
};

const COLUMNS: PrintColumn<Attendance>[] = [
    { key: 'date', label: 'Date', cell: (a) => formatDate(a.date, '-') },
    {
        key: 'member',
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
        label: 'External coach',
        cell: (a) => a.external_coach ?? '-',
    },
    { key: 'venue', label: 'Venue', cell: (a) => a.venue ?? '-' },
    { key: 'sport', label: 'Sport', cell: (a) => a.sport ?? '-' },
    {
        key: 'attendance',
        label: 'Attendance',
        cell: (a, t) => t(a.attendance_status),
    },
    {
        key: 'corrected',
        label: 'Corrected status',
        cell: (a, t) => (a.corrected_status ? t(a.corrected_status) : '-'),
    },
    { key: 'geo', label: 'Geo status', cell: (a, t) => t(a.geo_status) },
    {
        key: 'review',
        label: 'Review action',
        cell: (a, t) => t(REVIEW_LABELS[a.review_status] ?? a.review_status),
    },
    {
        key: 'distance',
        label: 'Distance',
        cell: (a) => (a.distance_meters ? `${a.distance_meters} m` : '-'),
    },
    {
        key: 'reviewer',
        label: 'Reviewed by',
        optional: true,
        cell: (a) => a.reviewed_by ?? '-',
    },
    {
        key: 'remarks',
        label: 'Coach remarks',
        optional: true,
        cell: (a) => a.coach_remarks ?? '-',
    },
];

export default function ExternalTrainingAttendancesPrint({
    attendances,
    filters,
    printedAt,
}: {
    attendances: Attendance[];
    filters: Filters;
    printedAt: string;
}) {
    const { t } = useTranslation();
    const title = t('External training attendance');

    return (
        <>
            <Head title={title} />
            <ColumnsPrint
                title={title}
                printedAt={printedAt}
                info={[
                    filters.selected > 0
                        ? `${t('Selected rows')}: ${filters.selected}`
                        : null,
                    filters.attendance_status
                        ? `${t('Attendance')}: ${t(filters.attendance_status)}`
                        : null,
                    filters.geo_status
                        ? `${t('Geo status')}: ${t(filters.geo_status)}`
                        : null,
                    filters.review_status
                        ? `${t('Review status')}: ${t(filters.review_status)}`
                        : null,
                    filters.q ? `${t('Search')}: ${filters.q}` : null,
                    filters.date_from || filters.date_to
                        ? `${t('Date')}: ${formatDate(filters.date_from, '…')} – ${formatDate(filters.date_to, '…')}`
                        : null,
                ]}
                rows={attendances}
                columns={COLUMNS}
                emptyText={t('No attendance records found.')}
            />
        </>
    );
}
