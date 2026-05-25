import { Head, router, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name_hi: string };
type Tier = { id: number; code: string; label: string };
type Unit = { id: number; name_hi: string };
type ReportMeta = { key: string; name_hi: string; name_en: string };
type Filters = Record<string, string | number | null>;

const ALL = 'all';

export default function ReportShow({
    report,
    data,
    filters,
    sessions,
    sports,
    tiers,
    units,
}: {
    report: ReportMeta;
    data: Record<string, unknown>[];
    filters: Filters;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Reports'), href: ReportController.index().url }, { title: report.name_hi }],
    });

    const [sessionId, setSessionId] = useState<string>(filters.session_id ? String(filters.session_id) : ALL);
    const [sportId, setSportId] = useState<string>(filters.sport_id ? String(filters.sport_id) : ALL);
    const [tierId, setTierId] = useState<string>(filters.tier_id ? String(filters.tier_id) : ALL);
    const [unitId, setUnitId] = useState<string>(filters.unit_id ? String(filters.unit_id) : ALL);

    function applyFilters() {
        const params: Record<string, string> = {};

        if (sessionId !== ALL) {
params.session_id = sessionId;
}

        if (sportId !== ALL) {
params.sport_id = sportId;
}

        if (tierId !== ALL) {
params.tier_id = tierId;
}

        if (unitId !== ALL) {
params.unit_id = unitId;
}

        router.get(ReportController.show(report.key).url, params, { preserveScroll: true });
    }

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <>
            <Head title={report.name_hi} />

            <div className="px-4 py-6">
                <Heading title={report.name_hi} description={report.name_en} />

                {/* Filter bar — full UI built in P7-T14 */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    {sessions.length > 0 && (
                        <Select value={sessionId} onValueChange={setSessionId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sessions')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('All Sessions')}</SelectItem>
                                {sessions.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {sports.length > 0 && (
                        <Select value={sportId} onValueChange={setSportId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sports')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('All Sports')}</SelectItem>
                                {sports.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name_hi}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {tiers.length > 0 && (
                        <Select value={tierId} onValueChange={setTierId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Tiers')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('All Tiers')}</SelectItem>
                                {tiers.map((tier) => (
                                    <SelectItem key={tier.id} value={String(tier.id)}>
                                        {tier.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {units.length > 0 && (
                        <Select value={unitId} onValueChange={setUnitId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Units')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('All Units')}</SelectItem>
                                {units.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name_hi}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button onClick={applyFilters}>{t('Apply')}</Button>
                </div>

                {/* Data table — full UI with Recharts + export in P7-T14 */}
                <div className="mt-6 overflow-x-auto rounded-md border">
                    {data.length === 0 ? (
                        <p className="text-muted-foreground p-6 text-sm">{t('No data found')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col) => (
                                        <TableHead key={col}>{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row, i) => (
                                    <TableRow key={i}>
                                        {columns.map((col) => (
                                            <TableCell key={col}>
                                                {typeof row[col] === 'object'
                                                    ? JSON.stringify(row[col])
                                                    : String(row[col] ?? '')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </>
    );
}
