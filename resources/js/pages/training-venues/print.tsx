import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';

type Venue = {
    id: number;
    name: string;
    code: string | null;
    city: string | null;
    district: string | null;
    unit: string | null;
    allowed_radius_meters: number;
    status: string;
};

const COLUMNS: PrintColumn<Venue>[] = [
    { key: 'name', label: 'Venue', cell: (v) => <strong>{v.name}</strong> },
    { key: 'code', label: 'Code', cell: (v) => v.code ?? '-' },
    { key: 'city', label: 'City', cell: (v) => v.city ?? '-' },
    { key: 'district', label: 'District', cell: (v) => v.district ?? '-' },
    { key: 'unit', label: 'Unit', cell: (v) => v.unit ?? '-' },
    {
        key: 'radius',
        label: 'Radius',
        cell: (v) => `${v.allowed_radius_meters} m`,
    },
    { key: 'status', label: 'Status', cell: (v, t) => t(v.status) },
];

export default function TrainingVenuesPrint({
    venues,
    filters,
    printedAt,
}: {
    venues: Venue[];
    filters: { q: string | null; status: string | null };
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
                    filters.q ? `${t('Search')}: ${filters.q}` : null,
                ]}
                rows={venues}
                columns={COLUMNS}
                emptyText={t('No training venues found.')}
            />
        </>
    );
}
