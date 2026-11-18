import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { PrintSheet } from '@/components/print/print-sheet';
import type { PrintOrientation } from '@/components/print/print-sheet';
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
    filters: { q: string | null; status: string | null; selected: number };
    printedAt: string;
};

const join = (items: Named) => items.map((item) => item.name).join(', ') || '-';

const COLUMNS: {
    key: string;
    label: string;
    cell: (coach: Coach, t: (key: string) => string) => React.ReactNode;
}[] = [
    {
        key: 'photo',
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
        label: 'Coach',
        cell: (coach) => <strong>{coach.name}</strong>,
    },
    { key: 'email', label: 'Email', cell: (coach) => coach.email },
    { key: 'phone', label: 'Phone', cell: (coach) => coach.phone ?? '-' },
    { key: 'city', label: 'City', cell: (coach) => coach.city ?? '-' },
    { key: 'sports', label: 'Sports', cell: (coach) => join(coach.sports) },
    {
        key: 'venues',
        label: 'Training venues',
        cell: (coach) => join(coach.training_venues),
    },
    {
        key: 'experience',
        label: 'Experience',
        cell: (coach) => coach.experience_years ?? '-',
    },
    {
        key: 'players',
        label: 'Active players',
        cell: (coach) => coach.active_coached_players_count,
    },
    { key: 'status', label: 'Status', cell: (coach, t) => t(coach.status) },
];

const DEFAULT_COLUMNS = COLUMNS.filter((column) => column.key !== 'city').map(
    (column) => column.key,
);

export default function ExternalCoachesPrint({
    coaches,
    filters,
    printedAt,
}: Props) {
    const { t } = useTranslation();
    const [orientation, setOrientation] =
        useState<PrintOrientation>('landscape');
    const [visible, setVisible] = useState<string[]>(DEFAULT_COLUMNS);
    const columns = COLUMNS.filter((column) => visible.includes(column.key));
    const info = [
        `${t('Total')}: ${coaches.length}`,
        filters.selected > 0
            ? `${t('Selected rows')}: ${filters.selected}`
            : null,
        filters.status ? `${t('Status')}: ${t(filters.status)}` : null,
        filters.q ? `${t('Search')}: ${filters.q}` : null,
    ].filter((line): line is string => line !== null);

    function toggle(key: string) {
        setVisible((current) =>
            current.includes(key)
                ? current.length > 1
                    ? current.filter((item) => item !== key)
                    : current
                : [...current, key],
        );
    }

    return (
        <>
            <Head title={t('External coaches')} />
            <PrintSheet
                title={t('External coaches')}
                printedAt={printedAt}
                info={info}
                orientation={orientation}
                onOrientationChange={setOrientation}
                controls={
                    <div className="print-control-card">
                        <span className="print-label">{t('Columns')}:</span>
                        {COLUMNS.map((column) => (
                            <label key={column.key} className="print-option">
                                <input
                                    type="checkbox"
                                    checked={visible.includes(column.key)}
                                    onChange={() => toggle(column.key)}
                                />
                                <span>{t(column.label)}</span>
                            </label>
                        ))}
                    </div>
                }
            >
                {coaches.length === 0 ? (
                    <div className="print-empty">
                        {t('No external coaches found.')}
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('S.No.')}</th>
                                {columns.map((column) => (
                                    <th key={column.key}>{t(column.label)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {coaches.map((coach, index) => (
                                <tr key={coach.id}>
                                    <td>{index + 1}</td>
                                    {columns.map((column) => (
                                        <td key={column.key}>
                                            {column.cell(coach, t)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </PrintSheet>
        </>
    );
}
