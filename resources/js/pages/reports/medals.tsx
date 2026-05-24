import { Head, setLayoutProps, useHttp } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import MedalsPivotController from '@/actions/App/Http/Controllers/Api/V1/MedalsPivotController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label_hi: string };

type PivotRow = {
    tier: { code: string; label_hi: string; weight: number };
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
};

type PivotResponse = {
    data: PivotRow[];
    filters: { session_id: number | null; sport_id: number | null; tier_id: number | null };
};

const ALL = 'all';

export default function ReportsMedals({
    defaultSessionId,
    sessions,
    sports,
    tiers,
}: {
    defaultSessionId: number | null;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Reports') }, { title: t('Medal Tally') }],
    });

    const [sessionId, setSessionId] = useState<string>(defaultSessionId ? String(defaultSessionId) : ALL);
    const [sportId, setSportId] = useState<string>(ALL);
    const [tierId, setTierId] = useState<string>(ALL);
    const [rows, setRows] = useState<PivotRow[] | null>(null);
    const { get, processing } = useHttp<Record<string, never>, PivotResponse>({});

    useEffect(() => {
        const params: Record<string, string> = {};

        if (sessionId !== ALL) {
 params['session_id'] = sessionId;
}

        if (sportId !== ALL) {
 params['sport_id'] = sportId;
}

        if (tierId !== ALL) {
 params['tier_id'] = tierId;
}

        get(MedalsPivotController.url(params), {
            onSuccess: (res) => {
                const r = res as unknown as PivotResponse;
                setRows(r?.data ?? []);
            },
            onError: () => setRows([]),
        });
    }, [sessionId, sportId, tierId, get]);

    const grandTotal = rows
        ? rows.reduce((acc, r) => acc + r.GOLD + r.SILVER + r.BRONZE + r.MERIT, 0)
        : null;

    return (
        <>
            <Head title={t('Medal Tally')} />

            <div className="space-y-6">
                <Heading title={t('Medal Tally')} />

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <Select value={sessionId} onValueChange={setSessionId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('All Sessions')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Sessions')}</SelectItem>
                            {sessions.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sportId} onValueChange={setSportId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('All Sports')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Sports')}</SelectItem>
                            {sports.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={tierId} onValueChange={setTierId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('All Tiers')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Tiers')}</SelectItem>
                            {tiers.map((tier) => (
                                <SelectItem key={tier.id} value={String(tier.id)}>
                                    {tier.label_hi} ({tier.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card">
                    {processing || rows === null ? (
                        <div className="space-y-2 p-4">
                            {[1, 2, 3, 4].map((n) => (
                                <Skeleton key={n} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="p-6">
                            <p className="text-sm text-muted-foreground">{t('No data.')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Tier')}</TableHead>
                                    <TableHead className="text-center">
                                        <Badge variant="default">{t('GOLD')}</Badge>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <Badge variant="secondary">{t('SILVER')}</Badge>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <Badge variant="outline">{t('BRONZE')}</Badge>
                                    </TableHead>
                                    <TableHead className="text-center">
                                        <Badge variant="outline">{t('MERIT')}</Badge>
                                    </TableHead>
                                    <TableHead className="text-center">{t('Total')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    const total = row.GOLD + row.SILVER + row.BRONZE + row.MERIT;

                                    return (
                                        <TableRow key={row.tier.code}>
                                            <TableCell className="font-medium">{row.tier.label_hi}</TableCell>
                                            <TableCell className="text-center font-semibold">{row.GOLD}</TableCell>
                                            <TableCell className="text-center font-semibold">{row.SILVER}</TableCell>
                                            <TableCell className="text-center font-semibold">{row.BRONZE}</TableCell>
                                            <TableCell className="text-center font-semibold">{row.MERIT}</TableCell>
                                            <TableCell className="text-center font-bold">{total}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {rows.length > 1 && (
                                    <TableRow className="border-t-2 font-bold">
                                        <TableCell>{t('Total')}</TableCell>
                                        <TableCell className="text-center">{rows.reduce((a, r) => a + r.GOLD, 0)}</TableCell>
                                        <TableCell className="text-center">{rows.reduce((a, r) => a + r.SILVER, 0)}</TableCell>
                                        <TableCell className="text-center">{rows.reduce((a, r) => a + r.BRONZE, 0)}</TableCell>
                                        <TableCell className="text-center">{rows.reduce((a, r) => a + r.MERIT, 0)}</TableCell>
                                        <TableCell className="text-center">{grandTotal}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </>
    );
}
