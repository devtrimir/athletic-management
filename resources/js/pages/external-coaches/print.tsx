import { Head } from '@inertiajs/react';
import { ColumnsPrint } from '@/components/print/columns-print';
import type { PrintColumn } from '@/components/print/columns-print';
import { useTranslation } from '@/hooks/use-translation';

type Named = { id: number; name: string }[];

type Coach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    photo_path: string | null;
    status: string;
    experience_years: number | null;
    city: string | null;
    active_coached_players_count: number;
    sports: Named;
    training_venues: Named;
};

type Props = {
    coaches: Coach[];
    filters: {
        q: string | null;
        status: string | null;
        sport: string | null;
        training_venue: string | null;
        selected: number;
    };
    printedAt: string;
};

const join = (items: Named) => items.map((item) => item.name).join(', ') || '-';

const COLUMNS: PrintColumn<Coach>[] = [
    {
        key: 'photo',
        optional: true,
        weight: 0.7,
        label: 'Photo',
        cell: (coach) =>
            coach.photo_path ? (
                <img
                    src={`/storage/${coach.photo_path}`}
                    alt=""
                    style={{
                        width: 34,
                        height: 34,
                        objectFit: 'cover',
                        borderRadius: '50%',
                    }}
                />
            ) : (
                '-'
            ),
    },
    {
        key: 'name',
        weight: 2,

        label: 'Coach',
        cell: (coach) => <strong>{coach.name}</strong>,
    },
    {
        key: 'email',
        weight: 2.6,

        breakAny: true,
        label: 'Email',
        cell: (coach) => coach.email,
    },
    {
        key: 'phone',
        weight: 1.3,
        label: 'Phone',
        cell: (coach) => coach.phone ?? '-',
    },
    {
        key: 'city',
        weight: 1.3,
        label: 'City',
        optional: true,
        cell: (coach) => coach.city ?? '-',
    },
    {
        key: 'sports',
        weight: 1.8,

        label: 'Sports',
        cell: (coach) => join(coach.sports),
    },
    {
        key: 'venues',
        weight: 2.2,

        label: 'Training venues',
        cell: (coach) => join(coach.training_venues),
    },
    {
        key: 'experience',
        weight: 1.2,
        label: 'Experience',
        cell: (coach) => coach.experience_years ?? '-',
    },
    {
        key: 'players',
        weight: 1.2,
        label: 'Active players',
        cell: (coach) => coach.active_coached_players_count,
    },
    {
        key: 'status',
        weight: 1.1,
        label: 'Status',
        cell: (coach, t) => t(coach.status),
    },
];

export default function ExternalCoachesPrint({
    coaches,
    filters,
    printedAt,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External coaches')} />
            <ColumnsPrint
                title={t('External coaches')}
                printedAt={printedAt}
                info={[
                    filters.selected > 0
                        ? `${t('Selected rows')}: ${filters.selected}`
                        : null,
                    filters.status
                        ? `${t('Status')}: ${t(filters.status)}`
                        : null,
                    filters.sport ? `${t('Sport')}: ${filters.sport}` : null,
                    filters.training_venue
                        ? `${t('Training venue')}: ${filters.training_venue}`
                        : null,
                    filters.q ? `${t('Search')}: ${filters.q}` : null,
                ]}
                rows={coaches}
                columns={COLUMNS}
                emptyText={t('No external coaches found.')}
            />
        </>
    );
}
