import { Head, Link } from '@inertiajs/react';
import { Edit3, Plus, Printer } from 'lucide-react';
import { useState } from 'react';

import {
    create,
    edit,
    index as indexUrl,
} from '@/actions/App/Http/Controllers/SportsCalendarController';
import { FilterPill, OptionList } from '@/components/data-table/filter-pill';
import {
    ListingLayout,
    ListingTable,
} from '@/components/data-table/listing-layout';
import {
    listingCellClass,
    listingHeadCellClass,
} from '@/components/data-table/table-primitives';
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
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useDebouncedSearch,
    useListingFilters,
} from '@/hooks/use-listing-filters';
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

const head = `${listingHeadCellClass} bg-muted text-center`;
const cell = `${listingCellClass} text-center`;

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
    const { apply, clear } = useListingFilters(indexUrl.url());
    const current = {
        q: filters.q,
        year: filters.year,
        report_arrived: filters.report_arrived,
    };
    const [search, setSearch] = useDebouncedSearch(filters.q, (q) =>
        apply(current, { q }),
    );
    const [printOpen, setPrintOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<readonly string[]>(
        ALL_COLUMNS.map((column) => column.key),
    );

    const yearList = [...new Set(yearOptions.map(String))].sort(
        (a, b) => Number(b) - Number(a),
    );
    const hasFilters = Boolean(
        filters.q || filters.year || filters.report_arrived,
    );
    const hasSelectedColumns = selectedColumns.length > 0;

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
            <ListingLayout
                title={t('Sports calendars')}
                description={t(
                    'Track yearly competition schedules and report availability.',
                )}
                search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: t('Search by competition, month, or venue'),
                }}
                actions={
                    <>
                        <Button asChild size="sm">
                            <Link href={create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add competition')}
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setPrintOpen(true)}
                            disabled={calendars.data.length === 0}
                            variant="outline"
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                    </>
                }
                filters={
                    <>
                        <FilterPill
                            label={t('Year')}
                            activeLabel={filters.year}
                            onClear={() => apply(current, { year: null })}
                        >
                            <OptionList
                                options={yearList.map((year) => ({
                                    value: year,
                                    label: year,
                                }))}
                                value={filters.year}
                                onSelect={(year) =>
                                    apply(current, { year: year ?? null })
                                }
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Report status')}
                            activeLabel={
                                filters.report_arrived
                                    ? t(
                                          filters.report_arrived === 'arrived'
                                              ? 'Report arrived'
                                              : 'Report not arrived',
                                      )
                                    : undefined
                            }
                            onClear={() =>
                                apply(current, { report_arrived: null })
                            }
                        >
                            <OptionList
                                options={[
                                    {
                                        value: 'arrived',
                                        label: t('Report arrived'),
                                    },
                                    {
                                        value: 'missing',
                                        label: t('Report not arrived'),
                                    },
                                ]}
                                value={filters.report_arrived}
                                onSelect={(report) =>
                                    apply(current, {
                                        report_arrived: report ?? null,
                                    })
                                }
                            />
                        </FilterPill>
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clear}
                resultCount={calendars.total}
                footer={
                    <ListingPagination
                        paginator={calendars}
                        itemLabel={t('calendar entries')}
                    />
                }
            >
                <ListingTable minWidth={1000} centered>
                    <colgroup>
                        <col style={{ width: 56 }} />
                        <col style={{ width: 64 }} />
                        <col />
                        <col style={{ width: '19%' }} />
                        <col style={{ width: '19%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 64 }} />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className={head} rowSpan={2}>
                                {t('S.No.')}
                            </TableHead>
                            <TableHead className={head} rowSpan={2}>
                                {t('Year')}
                            </TableHead>
                            <TableHead className={head} rowSpan={2}>
                                {t('Competition')}
                            </TableHead>
                            <TableHead className={head} colSpan={2}>
                                {t('Proposed month')}
                            </TableHead>
                            <TableHead className={head} rowSpan={2}>
                                {t('Proposed venue')}
                            </TableHead>
                            <TableHead className={head} rowSpan={2}>
                                {t('Report status')}
                            </TableHead>
                            <TableHead className={head} rowSpan={2}>
                                {t('Actions')}
                            </TableHead>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className={head}>
                                {t('Inter-unit / District competition month')}
                            </TableHead>
                            <TableHead className={head}>
                                {t('UP Police annual competition month')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {calendars.data.map((calendar, index) => (
                            <TableRow key={calendar.id}>
                                <TableCell className={cell}>
                                    {(calendars.from ?? 1) + index}
                                </TableCell>
                                <TableCell className={cell}>
                                    {calendar.year}
                                </TableCell>
                                <TableCell className={`${cell} font-medium`}>
                                    {calendar.competition_name}
                                </TableCell>
                                <TableCell className={cell}>
                                    {calendar.proposed_month}
                                </TableCell>
                                <TableCell className={cell}>
                                    {calendar.proposed_month_annual ?? '-'}
                                </TableCell>
                                <TableCell className={cell}>
                                    {calendar.proposed_venue}
                                </TableCell>
                                <TableCell className={cell}>
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
                                <TableCell className={cell}>
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
                </ListingTable>
            </ListingLayout>

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
        </>
    );
}
