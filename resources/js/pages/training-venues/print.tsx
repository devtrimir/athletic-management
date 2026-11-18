import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';

type Venue = {
    id: number;
    name: string;
    code: string | null;
    city: string | null;
    allowed_radius_meters: number;
    status: string;
};

const COLUMNS: PrintColumn<Venue>[] = [
    {
        key: 'name',
        weight: 3,

        label: 'Venue',
        cell: (v) => <strong>{v.name}</strong>,
    },
    {
        key: 'code',
        weight: 1,
        breakAny: true,
        label: 'Code',
        cell: (v) => v.code ?? '-',
    },
    { key: 'city', weight: 1.5, label: 'City', cell: (v) => v.city ?? '-' },
    {
        key: 'radius',
        weight: 1.1,
        label: 'Radius',
        cell: (v) => `${v.allowed_radius_meters} m`,
    },
    { key: 'status', weight: 1, label: 'Status', cell: (v, t) => t(v.status) },
];

export default function TrainingVenuesPrint({
    venues,
    filters,
    printedAt,
}: {
    venues: Venue[];
    filters: {
        q: string | null;
        status: string | null;
        city: string | null;
        state: string | null;
        coach: string | null;
        sport: string | null;
    };
    printedAt: string;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Training venues')} />
            <ColumnsPrint
                title={t('Training venues')}
                printedAt={printedAt}
                info={[
                    filters.status
                        ? `${t('Status')}: ${t(filters.status)}`
                        : null,
                    filters.city ? `${t('City')}: ${filters.city}` : null,
                    filters.state ? `${t('State')}: ${filters.state}` : null,
                    filters.coach
                        ? `${t('External coach')}: ${filters.coach}`
                        : null,
                    filters.sport ? `${t('Sport')}: ${filters.sport}` : null,
                    filters.q ? `${t('Search')}: ${filters.q}` : null,
                ]}
                rows={venues}
                columns={COLUMNS}
                emptyText={t('No training venues found.')}
            />
        </>
    );
}
