import { Head, Link, router } from '@inertiajs/react';
import { Edit3, Search, X, Printer } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
    create,
    edit,
    index as indexUrl,
} from '@/actions/App/Http/Controllers/SportsCalendarController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useTranslation } from '@/hooks/use-translation';

const ALL_COLUMNS = [
    { key: 'year', label: 'Year' },
    { key: 'competition_name', label: 'Competition' },
    { key: 'proposed_month', label: 'Inter-unit / District competition month' },
    {
        key: 'proposed_month_annual',
        label: 'UP Police annual competition month',
    },
    { key: 'proposed_venue', label: 'Proposed venue' },
] as const;

type PaginationLink = { url: string | null; label: string; active: boolean };
type PaginatedCalendars = {
    data: SportsCalendar[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type SportsCalendar = {
    id: number;
    year: number;
    competition_name: string;
    proposed_month: string;
    proposed_month_annual: string | null;
    proposed_venue: string;
    report_arrived: boolean;
};

type Filters = {
    q?: string;
    year?: string;
    report_arrived?: string;
};

export default function SportsCalendarsIndex({
    calendars,
    filters,
    yearOptions,
}: {
    calendars: PaginatedCalendars;
    filters: Filters;
    yearOptions: (string | number)[];
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(filters.q ?? '');
    const [yearFilter, setYearFilter] = useState(filters.year ?? 'all');
    const [reportFilter, setReportFilter] = useState(
        filters.report_arrived ?? 'all',
    );
    const [printOpen, setPrintOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<readonly string[]>(
        ALL_COLUMNS.map((column) => column.key),
    );

    const yearList = [...new Set(yearOptions.map(String))].sort(
        (a, b) => Number(b) - Number(a),
    );
    const hasFilters =
        query.trim() !== '' || yearFilter !== 'all' || reportFilter !== 'all';
    const hasSelectedColumns = selectedColumns.length > 0;

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        const params: Record<string, string> = {};

        if (query.trim() !== '') {
            params['filter[q]'] = query.trim();
        }

        if (yearFilter !== 'all') {
            params['filter[year]'] = yearFilter;
        }

        if (reportFilter !== 'all') {
            params['filter[report_arrived]'] = reportFilter;
        }

        router.get(indexUrl.url(), params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setQuery('');
        setYearFilter('all');
        setReportFilter('all');
        router.get(
            indexUrl.url(),
            {},
            { replace: true, preserveScroll: true, preserveState: true },
        );
    }

    function toggleColumn(columnKey: string): void {
        setSelectedColumns((prev) => {
            if (prev.includes(columnKey)) {
                return prev.filter((key) => key !== columnKey);
            }

            return [...prev, columnKey];
        });
    }

    function escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function handlePrint() {
        if (!hasSelectedColumns) {
            return;
        }

        const visibleColumns = ALL_COLUMNS.filter((column) =>
            selectedColumns.includes(column.key),
        );
        const headers = visibleColumns
            .map((column) => `<th>${escapeHtml(t(column.label))}</th>`)
            .join('');
        const bodyRows = calendars.data
            .map(
                (calendar) =>
                    `<tr>${visibleColumns
                        .map((column) => {
                            const value = String(
                                column.key === 'proposed_month_annual'
                                    ? (calendar.proposed_month_annual ?? '')
                                    : (calendar[
                                          column.key as keyof SportsCalendar
                                      ] ?? ''),
                            );

                            return `<td>${escapeHtml(value)}</td>`;
                        })
                        .join('')}</tr>`,
            )
            .join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(t('Sports calendars'))}</title><style>body{font-family:sans-serif;font-size:10px;line-height:1.3;padding:12px}h2{font-size:13px;margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 6px;text-align:left;vertical-align:top}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${escapeHtml(t('Sports calendars'))}</h2><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
    }

    return (
        <>
            <Head title={t('Sports calendars')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={t('Sports calendars')}
                        description={t(
                            'Track yearly competition schedules and report availability.',
                        )}
                    />
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={create.url()}>
                                {t('Add competition')}
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setPrintOpen(true)}
                            disabled={calendars.data.length === 0}
                            variant="outline"
                        >
                            <Printer className="size-4" />
                            {t('Print')}
                        </Button>
                    </div>
                </div>

                <form
                    className="space-y-4 rounded-xl border bg-card p-4"
                    onSubmit={applyFilters}
                >
                    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))] items-end gap-2">
                        <div className="grid gap-2">
                            <Label htmlFor="q" className="text-sm font-medium">
                                {t('Search')}
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="q"
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder={t(
                                        'Search by competition, month, or venue',
                                    )}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="year_filter"
                                className="text-sm font-medium"
                            >
                                {t('Year')}
                            </Label>
                            <Select
                                value={yearFilter}
                                onValueChange={setYearFilter}
                            >
                                <SelectTrigger id="year_filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('All years')}
                                    </SelectItem>
                                    {yearList.map((year) => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="report_filter"
                                className="text-sm font-medium"
                            >
                                {t('Report status')}
                            </Label>
                            <Select
                                value={reportFilter}
                                onValueChange={setReportFilter}
                            >
                                <SelectTrigger id="report_filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('All')}
                                    </SelectItem>
                                    <SelectItem value="arrived">
                                        {t('Report arrived')}
                                    </SelectItem>
                                    <SelectItem value="missing">
                                        {t('Report not arrived')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            {hasFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                >
                                    <X className="size-4" />
                                    {t('Clear filters')}
                                </Button>
                            ) : null}
                            <Button type="submit">{t('Apply filters')}</Button>
                        </div>
                    </div>
                </form>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16" rowSpan={2}>
                                    {t('S.No.')}
                                </TableHead>
                                <TableHead rowSpan={2}>{t('Year')}</TableHead>
                                <TableHead rowSpan={2}>
                                    {t('Competition')}
                                </TableHead>
                                <TableHead colSpan={2}>
                                    {t('Proposed month')}
                                </TableHead>
                                <TableHead rowSpan={2}>
                                    {t('Proposed venue')}
                                </TableHead>
                                <TableHead>{t('Report status')}</TableHead>
                                <TableHead className="w-24 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead>
                                    {t(
                                        'Inter-unit / District competition month',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {t('UP Police annual competition month')}
                                </TableHead>
                                <TableHead />
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calendars.data.map((calendar, index) => (
                                <TableRow key={calendar.id}>
                                    <TableCell>
                                        {(calendars.from ?? 1) + index}
                                    </TableCell>
                                    <TableCell>{calendar.year}</TableCell>
                                    <TableCell className="font-medium">
                                        {calendar.competition_name}
                                    </TableCell>
                                    <TableCell>
                                        {calendar.proposed_month}
                                    </TableCell>
                                    <TableCell>
                                        {calendar.proposed_month_annual ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        {calendar.proposed_venue}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                calendar.report_arrived
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {calendar.report_arrived
                                                ? t('Report arrived')
                                                : t('Report not arrived')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Link
                                                    href={edit.url(calendar)}
                                                    aria-label={t('Edit')}
                                                >
                                                    <Edit3 className="size-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {calendars.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        {t('No sports calendars found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination
                    paginator={calendars}
                    itemLabel={t('calendar entries')}
                />

                <Dialog open={printOpen} onOpenChange={setPrintOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {t('Select columns to print')}
                            </DialogTitle>
                            <DialogDescription>
                                {t(
                                    'Choose fields and print the current page only.',
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            {ALL_COLUMNS.map((column) => (
                                <label
                                    key={column.key}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={selectedColumns.includes(
                                            column.key,
                                        )}
                                        onCheckedChange={() =>
                                            toggleColumn(column.key)
                                        }
                                    />
                                    <span>{t(column.label)}</span>
                                </label>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => {
                                    handlePrint();
                                    setPrintOpen(false);
                                }}
                                disabled={!hasSelectedColumns}
                            >
                                <Printer className="size-4" />
                                {t('Print')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPrintOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
