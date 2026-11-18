import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';

type Update = {
    id: number;
    update_date: string | null;
    member: string | null;
    pno: string | null;
    external_coach: string | null;
    sport: string | null;
    performance_score: number | null;
    performance_level: string | null;
    review_status: string;
    reviewed_by: string | null;
    training_summary: string | null;
    improvement_notes: string | null;
};

type Filters = {
    memberQuery: string | null;
    coachQuery: string | null;
    reviewStatus: string | null;
    dateFrom: string | null;
    dateTo: string | null;
};

const COLUMNS: PrintColumn<Update>[] = [
    { key: 'date', label: 'Date', cell: (u) => formatDate(u.update_date, '-') },
    {
        key: 'member',
        label: 'Member',
        cell: (u) => (
            <>
                <strong>{u.member ?? '-'}</strong>
                {u.pno && <div className="muted">{u.pno}</div>}
            </>
        ),
    },
    {
        key: 'coach',
        label: 'External coach',
        cell: (u) => u.external_coach ?? '-',
    },
    { key: 'sport', label: 'Sport', cell: (u) => u.sport ?? '-' },
    { key: 'score', label: 'Score', cell: (u) => u.performance_score ?? '-' },
    {
        key: 'level',
        label: 'Level',
        cell: (u, t) => (u.performance_level ? t(u.performance_level) : '-'),
    },
    {
        key: 'status',
        label: 'Review status',
        cell: (u, t) => t(u.review_status),
    },
    {
        key: 'reviewer',
        label: 'Reviewed by',
        optional: true,
        cell: (u) => u.reviewed_by ?? '-',
    },
    {
        key: 'summary',
        label: 'Training summary',
        optional: true,
        cell: (u) => u.training_summary ?? '-',
    },
    {
        key: 'notes',
        label: 'Improvement notes',
        optional: true,
        cell: (u) => u.improvement_notes ?? '-',
    },
];

export default function ExternalCoachPerformanceUpdatesPrint({
    updates,
    filters,
    sportName,
    printedAt,
}: {
    updates: Update[];
    filters: Filters;
    sportName: string | null;
    printedAt: string;
}) {
    const { t } = useTranslation();
    const title = t('External coach performance updates');

    return (
        <>
            <Head title={title} />
            <ColumnsPrint
                title={title}
                printedAt={printedAt}
                info={[
                    filters.reviewStatus
                        ? `${t('Review status')}: ${t(filters.reviewStatus)}`
                        : null,
                    sportName ? `${t('Sport')}: ${sportName}` : null,
                    filters.memberQuery
                        ? `${t('Member')}: ${filters.memberQuery}`
                        : null,
                    filters.coachQuery
                        ? `${t('Coach')}: ${filters.coachQuery}`
                        : null,
                    filters.dateFrom || filters.dateTo
                        ? `${t('Date')}: ${formatDate(filters.dateFrom, '…')} – ${formatDate(filters.dateTo, '…')}`
                        : null,
                ]}
                rows={updates}
                columns={COLUMNS}
                emptyText={t('No performance updates found.')}
            />
        </>
    );
}
