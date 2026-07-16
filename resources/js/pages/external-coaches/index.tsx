import { Head, Link, router } from '@inertiajs/react';
import {
    Download,
    Eye,
    Mail,
    Phone,
    Plus,
    Printer,
    Search,
    Users,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuthorization } from '@/hooks/use-authorization';
import { useTranslation } from '@/hooks/use-translation';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    experience_years: number | null;
    active_coached_players_count: number;
};

type Props = {
    externalCoaches: {
        data: ExternalCoach[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        q?: string | null;
        status?: string | null;
    };
    statuses: string[];
    perPage: number;
};

function escapeCsvCell(value: string | number | null): string {
    const text = String(value ?? '').replaceAll('"', '""');

    return `"${text}"`;
}

export default function ExternalCoachesIndex({
    externalCoaches,
    filters,
    statuses,
    perPage,
}: Props) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canCreateExternalCoach = can('external-coaches.create');
    const canExportExternalCoaches = can('coaches.export');
    const canPrintExternalCoaches = can('coaches.print');
    const [search, setSearch] = useState(filters.q ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [selectedCoachIds, setSelectedCoachIds] = useState<number[]>([]);
    const hasFilters = search.trim() !== '' || status !== 'all';
    const currentPageCoachIds = externalCoaches.data.map((coach) => coach.id);
    const selectedOnCurrentPage = currentPageCoachIds.filter((id) =>
        selectedCoachIds.includes(id),
    );
    const hasRows = currentPageCoachIds.length > 0;
    const allCurrentPageSelected =
        hasRows && selectedOnCurrentPage.length === currentPageCoachIds.length;
    const someCurrentPageSelected = selectedOnCurrentPage.length > 0;

    useEffect(() => {
        // Keep form inputs in sync with URL filters when they change externally.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearch(filters.q ?? '');
        setStatus(filters.status ?? 'all');
    }, [filters.q, filters.status]);

    useEffect(() => {
        // Clear cross-page selections whenever the listing context changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedCoachIds([]);
    }, [externalCoaches.current_page, filters.q, filters.status, perPage]);

    function toggleCoachSelection(coachId: number) {
        setSelectedCoachIds((current) =>
            current.includes(coachId)
                ? current.filter((id) => id !== coachId)
                : [...current, coachId],
        );
    }

    function toggleCurrentPageSelection() {
        setSelectedCoachIds((current) => {
            if (allCurrentPageSelected) {
                return current.filter(
                    (id) => !currentPageCoachIds.includes(id),
                );
            }

            return Array.from(new Set([...current, ...currentPageCoachIds]));
        });
    }

    function filterParams(nextPerPage = perPage): Record<string, string> {
        const params: Record<string, string> = {
            per_page: String(nextPerPage),
        };

        if (search.trim() !== '') {
            params['filter[q]'] = search.trim();
        }

        if (status !== 'all') {
            params['filter[status]'] = status;
        }

        return params;
    }

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        router.get('/external-coaches', filterParams(), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStatus('all');

        router.get(
            '/external-coaches',
            { per_page: String(perPage) },
            {
                replace: true,
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function changePerPage(value: number) {
        router.get('/external-coaches', filterParams(value), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function selectedOrVisibleCoaches(): ExternalCoach[] {
        if (selectedCoachIds.length === 0) {
            return externalCoaches.data;
        }

        return externalCoaches.data.filter((coach) =>
            selectedCoachIds.includes(coach.id),
        );
    }

    function rowNumber(coach: ExternalCoach): number | string {
        const index = externalCoaches.data.findIndex(
            (currentCoach) => currentCoach.id === coach.id,
        );

        return index === -1 ? '-' : (externalCoaches.from ?? 1) + index;
    }

    function exportCsv() {
        const headers = [
            t('S.No.'),
            t('Name'),
            t('Email'),
            t('Phone'),
            t('Experience'),
            t('Active players'),
            t('Status'),
        ];

        const rows = selectedOrVisibleCoaches().map((coach) => [
            rowNumber(coach),
            coach.name,
            coach.email,
            coach.phone ?? '-',
            coach.experience_years ?? '-',
            coach.active_coached_players_count,
            t(coach.status),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map(escapeCsvCell).join(',')),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `external-coaches-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    function printTable() {
        const headers = [
            t('S.No.'),
            t('Coach'),
            t('Email'),
            t('Phone'),
            t('Coaching'),
            t('Status'),
        ];

        const printWindow = window.open('', '_blank', 'width=1100,height=800');

        if (!printWindow) {
            return;
        }

        const coachesToPrint = selectedOrVisibleCoaches();

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${t('External coaches')}</title>
                    <style>
                        body{font-family:Arial,sans-serif;padding:16px;font-size:12px}
                        h2{font-size:18px;margin:0 0 12px}
                        table{width:100%;border-collapse:collapse}
                        th,td{border:1px solid #ccc;padding:6px 8px;text-align:center;vertical-align:middle}
                        th{background:#1f2937;color:#fff}
                    </style>
                </head>
                <body>
                    <h2>${t('External coaches')}</h2>
                    <table>
                        <thead>
                            <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${coachesToPrint
                                .map((coach) => {
                                    const cells = [
                                        rowNumber(coach),
                                        coach.name,
                                        coach.email,
                                        coach.phone ?? '-',
                                        [
                                            `${t('Experience')}: ${coach.experience_years ?? '-'}`,
                                            `${t('Active players')}: ${coach.active_coached_players_count}`,
                                        ].join(' / '),
                                        t(coach.status),
                                    ];

                                    return `<tr>${cells
                                        .map(
                                            (cell) =>
                                                `<td>${String(cell)}</td>`,
                                        )
                                        .join('')}</tr>`;
                                })
                                .join('')}
                        </tbody>
                    </table>
                    <script>window.onload=()=>{window.print();window.close()};</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    return (
        <>
            <Head title={t('External coaches')} />

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('External coaches')}
                        description={t(
                            'Manage external coaches and portal access.',
                        )}
                    />
                    <div className="flex gap-2">
                        {canPrintExternalCoaches ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={printTable}
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print')}
                            </Button>
                        ) : null}
                        {canExportExternalCoaches ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={exportCsv}
                            >
                                <Download className="mr-1.5 h-4 w-4" />
                                {t('Export CSV')}
                            </Button>
                        ) : null}
                        {canCreateExternalCoach ? (
                            <Button asChild size="sm">
                                <Link href="/external-coaches/create">
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Create external coach')}
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="shrink-0 rounded-xl border bg-card p-3 shadow-sm"
                >
                    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="coach-search">{t('Search')}</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="coach-search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={t(
                                        'Search name, email, or phone',
                                    )}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="coach-status">{t('Status')}</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger
                                    id="coach-status"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('All statuses')}
                                    </SelectItem>
                                    {statuses.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">
                                <Search className="size-4" />
                                {t('Filter')}
                            </Button>
                            {hasFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                >
                                    <X className="size-4" />
                                    {t('Clear')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </form>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                    {selectedCoachIds.length > 0 ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-sm">
                            <span className="font-medium">
                                {selectedCoachIds.length}{' '}
                                {t('external coaches selected')}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCoachIds([])}
                            >
                                <X className="size-4" />
                                {t('Clear selection')}
                            </Button>
                        </div>
                    ) : null}
                    <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:h-full">
                        <Table className="border-separate border-spacing-0 text-sm">
                            <TableHeader className="sticky top-0 z-10">
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableHead className="w-12 border-r border-b px-3 py-2 text-center font-semibold">
                                        <Checkbox
                                            checked={
                                                allCurrentPageSelected
                                                    ? true
                                                    : someCurrentPageSelected
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            disabled={!hasRows}
                                            onCheckedChange={
                                                toggleCurrentPageSelection
                                            }
                                            aria-label={t(
                                                'Select all external coaches on this page',
                                            )}
                                        />
                                    </TableHead>
                                    <TableHead className="w-16 border-r border-b px-3 py-2 text-center font-semibold">
                                        {t('S.No.')}
                                    </TableHead>
                                    <TableHead className="border-r border-b px-3 py-2 font-semibold">
                                        {t('Coach')}
                                    </TableHead>
                                    <TableHead className="border-r border-b px-3 py-2 font-semibold">
                                        {t('Email')}
                                    </TableHead>
                                    <TableHead className="border-r border-b px-3 py-2 font-semibold">
                                        {t('Phone')}
                                    </TableHead>
                                    <TableHead className="border-r border-b px-3 py-2 font-semibold">
                                        {t('Coaching')}
                                    </TableHead>
                                    <TableHead className="w-32 border-r border-b px-3 py-2 text-center font-semibold">
                                        {t('Status')}
                                    </TableHead>
                                    <TableHead className="w-28 border-b px-3 py-2 text-right font-semibold">
                                        {t('Actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {externalCoaches.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {t('No external coaches found.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    externalCoaches.data.map((coach, index) => (
                                        <TableRow
                                            key={coach.id}
                                            className="odd:bg-background even:bg-muted/20 hover:bg-sky-50/70 dark:hover:bg-sky-950/20"
                                        >
                                            <TableCell className="border-r border-b px-3 py-2 text-center align-top">
                                                <Checkbox
                                                    checked={selectedCoachIds.includes(
                                                        coach.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleCoachSelection(
                                                            coach.id,
                                                        )
                                                    }
                                                    aria-label={`${t('Select external coach')} ${coach.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 text-center font-semibold text-muted-foreground tabular-nums">
                                                {(externalCoaches.from ?? 1) +
                                                    index}
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 align-top">
                                                <div className="min-w-56">
                                                    <Link
                                                        href={`/external-coaches/${coach.id}`}
                                                        className="font-semibold text-primary hover:underline"
                                                    >
                                                        {coach.name}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 align-top">
                                                <div className="flex min-w-64 items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-sky-600" />
                                                    <span className="text-sm break-all">
                                                        {coach.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 align-top">
                                                <div className="flex min-w-36 items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-sm">
                                                        {coach.phone ?? '-'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 align-top">
                                                <div className="grid min-w-52 gap-1 text-xs sm:grid-cols-2">
                                                    <div className="rounded-md border px-2 py-1">
                                                        <div className="text-muted-foreground">
                                                            {t('Experience')}
                                                        </div>
                                                        <div className="font-semibold tabular-nums">
                                                            {coach.experience_years ??
                                                                '-'}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border px-2 py-1">
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Users className="h-3.5 w-3.5" />
                                                            {t(
                                                                'Active players',
                                                            )}
                                                        </div>
                                                        <div className="font-semibold tabular-nums">
                                                            {
                                                                coach.active_coached_players_count
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r border-b px-3 py-2 text-center align-top">
                                                <Badge variant="outline">
                                                    {t(coach.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="border-b px-3 py-2 text-right align-top">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={`/external-coaches/${coach.id}`}
                                                    >
                                                        <Eye className="mr-1.5 size-3.5" />
                                                        {t('View')}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ListingPagination
                    paginator={externalCoaches}
                    itemLabel={t('external coaches')}
                    rowsPerPage={{
                        value: perPage,
                        options: [10, 25, 50, 100],
                        onChange: changePerPage,
                    }}
                    className="shrink-0 shadow-sm"
                />
            </div>
        </>
    );
}
