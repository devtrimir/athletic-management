import { Head, Link, router } from '@inertiajs/react';
import { Download, Eye, Plus, Printer, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    FilterPill,
    OptionList,
    SearchableOptionList,
} from '@/components/data-table/filter-pill';
import {
    SelectionHeaderCheckbox,
    SelectionRowCheckbox,
    listingCellClass,
    listingHeadCellClass,
    listingTableClass,
    stickyLeftBodyCellClass,
    stickyLeftHeadCellClass,
    stickyRightBodyCellClass,
    stickyRightHeadCellClass,
} from '@/components/data-table/table-primitives';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { MemberAvatar } from '@/components/members/member-table-cells';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    photo_path: string | null;
    sports: { id: number; name: string }[];
    training_venues: { id: number; name: string }[];
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
        sport_id?: string | null;
        training_venue_id?: string | null;
    };
    statuses: string[];
    sports: Named;
    trainingVenues: Named;
    perPage: number;
};

type Named = { id: number; name: string }[];

function joinNames(items: Named): string {
    return items.map((item) => item.name).join(', ');
}

/** First two names plus a "+N" badge; full list on hover. */
function NameList({ items }: { items: Named }) {
    if (items.length === 0) {
        return <>-</>;
    }

    return (
        <span
            className="flex min-w-0 items-center gap-1"
            title={joinNames(items)}
        >
            <span className="truncate">{joinNames(items.slice(0, 2))}</span>
            {items.length > 2 && (
                <Badge
                    variant="outline"
                    className="shrink-0 px-1.5 py-0 text-[10px]"
                >
                    +{items.length - 2}
                </Badge>
            )}
        </span>
    );
}

function escapeCsvCell(value: string | number | null): string {
    const text = String(value ?? '').replaceAll('"', '""');

    return `"${text}"`;
}

export default function ExternalCoachesIndex({
    externalCoaches,
    filters,
    statuses,
    sports,
    trainingVenues,
    perPage,
}: Props) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canCreateExternalCoach = can('external-coaches.create');
    const canExportExternalCoaches = can('coaches.export');
    const canPrintExternalCoaches = can('coaches.print');
    const [search, setSearch] = useState(filters.q ?? '');
    const status = filters.status ?? 'all';
    const [selectedCoachIds, setSelectedCoachIds] = useState<number[]>([]);
    const hasFilters =
        search.trim() !== '' ||
        status !== 'all' ||
        Boolean(filters.sport_id) ||
        Boolean(filters.training_venue_id);
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
    }, [filters.q]);

    useEffect(() => {
        // Debounced live search, same behaviour as the members listing.
        if (search.trim() === (filters.q ?? '')) {
            return;
        }

        const timer = setTimeout(() => applyFilters({ q: search }), 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        // Clear cross-page selections whenever the listing context changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedCoachIds([]);
    }, [
        externalCoaches.current_page,
        filters.q,
        filters.status,
        filters.sport_id,
        filters.training_venue_id,
        perPage,
    ]);

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

    type FilterOverrides = {
        q?: string;
        status?: string;
        sport_id?: string;
        training_venue_id?: string;
        perPage?: number;
    };

    function filterParams(
        overrides: FilterOverrides = {},
    ): Record<string, string> {
        const q = (overrides.q ?? search).trim();
        const nextStatus =
            'status' in overrides ? overrides.status : filters.status;
        const nextSport =
            'sport_id' in overrides ? overrides.sport_id : filters.sport_id;
        const nextVenue =
            'training_venue_id' in overrides
                ? overrides.training_venue_id
                : filters.training_venue_id;
        const params: Record<string, string> = {
            per_page: String(overrides.perPage ?? perPage),
        };

        if (q !== '') {
            params['filter[q]'] = q;
        }

        if (nextStatus && nextStatus !== 'all') {
            params['filter[status]'] = nextStatus;
        }

        if (nextSport) {
            params['filter[sport_id]'] = nextSport;
        }

        if (nextVenue) {
            params['filter[training_venue_id]'] = nextVenue;
        }

        return params;
    }

    function applyFilters(overrides: FilterOverrides = {}) {
        router.get('/external-coaches', filterParams(overrides), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setSearch('');
        router.get(
            '/external-coaches',
            { per_page: String(perPage) },
            { replace: true, preserveScroll: true, preserveState: true },
        );
    }

    function changePerPage(value: number) {
        router.get('/external-coaches', filterParams({ perPage: value }), {
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
            t('Sports'),
            t('Training venues'),
            t('Experience'),
            t('Active players'),
            t('Status'),
        ];

        const rows = selectedOrVisibleCoaches().map((coach) => [
            rowNumber(coach),
            coach.name,
            coach.email,
            coach.phone ?? '-',
            joinNames(coach.sports) || '-',
            joinNames(coach.training_venues) || '-',
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
        const params = new URLSearchParams();

        if (filters.q) {
            params.set('filter[q]', filters.q);
        }

        if (filters.status) {
            params.set('filter[status]', filters.status);
        }

        if (filters.sport_id) {
            params.set('filter[sport_id]', filters.sport_id);
        }

        if (filters.training_venue_id) {
            params.set('filter[training_venue_id]', filters.training_venue_id);
        }

        selectedCoachIds.forEach((id) => params.append('ids[]', String(id)));
        window.open(
            `/external-coaches/print?${params.toString()}`,
            '_blank',
            'noopener',
        );
    }

    return (
        <>
            <Head title={t('External coaches')} />

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('External coaches')}
                        description={t(
                            'Manage external coaches and portal access.',
                        )}
                    />
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="relative w-56 shrink-0">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t('Search name, email, or phone')}
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
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
                                {selectedCoachIds.length > 0
                                    ? `${t('Export CSV')} (${selectedCoachIds.length})`
                                    : t('Export CSV')}
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

                <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-hidden rounded-xl border bg-card p-1">
                    <FilterPill
                        label={t('Status')}
                        activeLabel={status !== 'all' ? t(status) : undefined}
                        onClear={() => applyFilters({ status: undefined })}
                    >
                        <OptionList
                            options={statuses.map((option) => ({
                                value: option,
                                label: t(option),
                            }))}
                            value={filters.status ?? undefined}
                            onSelect={(value) =>
                                applyFilters({ status: value })
                            }
                        />
                    </FilterPill>
                    <FilterPill
                        label={t('Sport')}
                        activeLabel={
                            sports.find(
                                (sport) =>
                                    String(sport.id) === filters.sport_id,
                            )?.name
                        }
                        onClear={() => applyFilters({ sport_id: undefined })}
                    >
                        <SearchableOptionList
                            options={sports.map((sport) => ({
                                value: String(sport.id),
                                label: sport.name,
                            }))}
                            value={filters.sport_id ?? undefined}
                            searchPlaceholder={t('Search sports…')}
                            onSelect={(value) =>
                                applyFilters({ sport_id: value })
                            }
                        />
                    </FilterPill>
                    <FilterPill
                        label={t('Training venue')}
                        activeLabel={
                            trainingVenues.find(
                                (venue) =>
                                    String(venue.id) ===
                                    filters.training_venue_id,
                            )?.name
                        }
                        onClear={() =>
                            applyFilters({ training_venue_id: undefined })
                        }
                    >
                        <SearchableOptionList
                            options={trainingVenues.map((venue) => ({
                                value: String(venue.id),
                                label: venue.name,
                            }))}
                            value={filters.training_venue_id ?? undefined}
                            searchPlaceholder={t('Search venues…')}
                            onSelect={(value) =>
                                applyFilters({ training_venue_id: value })
                            }
                        />
                    </FilterPill>
                    <div className="min-w-0 flex-1" />
                    {hasFilters && (
                        <button
                            type="button"
                            className="h-8 shrink-0 animate-in px-2 text-xs text-muted-foreground duration-150 fade-in-0 hover:text-foreground"
                            onClick={clearFilters}
                        >
                            <X className="mr-1 inline size-3" />
                            {t('Clear filters')}
                        </button>
                    )}
                </div>

                {hasFilters && (
                    <p className="shrink-0 animate-in text-xs text-muted-foreground duration-150 fade-in-0">
                        {externalCoaches.total} {t('results')}
                    </p>
                )}

                <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="h-full min-h-0 max-w-full min-w-0 overflow-hidden rounded-xl border bg-card [&>[data-slot=table-container]]:h-full">
                        <Table
                            className={`${listingTableClass} min-w-[1400px]`}
                        >
                            <colgroup>
                                <col className="w-9" />
                                <col className="w-11" />
                                <col className="w-[52px]" />
                                <col className="w-[220px]" />
                                <col className="w-[260px]" />
                                <col className="w-[140px]" />
                                <col className="w-[200px]" />
                                <col className="w-[240px]" />
                                <col className="w-[100px]" />
                                <col className="w-[120px]" />
                                <col />
                                <col className="w-[80px]" />
                            </colgroup>
                            <TableHeader className="sticky top-0 z-20">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead
                                        style={{ left: 0 }}
                                        className={cn(
                                            listingHeadCellClass,
                                            stickyLeftHeadCellClass,
                                        )}
                                    >
                                        <SelectionHeaderCheckbox
                                            checked={allCurrentPageSelected}
                                            indeterminate={
                                                !allCurrentPageSelected &&
                                                someCurrentPageSelected
                                            }
                                            onCheckedChange={
                                                toggleCurrentPageSelection
                                            }
                                            label={t(
                                                'Select all external coaches on this page',
                                            )}
                                        />
                                    </TableHead>
                                    <TableHead
                                        style={{ left: 36 }}
                                        className={cn(
                                            listingHeadCellClass,
                                            stickyLeftHeadCellClass,
                                            'text-center',
                                        )}
                                    >
                                        {t('S.No.')}
                                    </TableHead>
                                    <TableHead
                                        style={{ left: 80 }}
                                        className={cn(
                                            listingHeadCellClass,
                                            stickyLeftHeadCellClass,
                                        )}
                                    >
                                        {t('Photo')}
                                    </TableHead>
                                    <TableHead
                                        style={{ left: 132 }}
                                        className={cn(
                                            listingHeadCellClass,
                                            stickyLeftHeadCellClass,
                                        )}
                                    >
                                        {t('Coach')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Email')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Phone')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Sports')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Training venues')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Experience')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Active players')}
                                    </TableHead>
                                    <TableHead className={listingHeadCellClass}>
                                        {t('Status')}
                                    </TableHead>
                                    <TableHead
                                        className={cn(
                                            listingHeadCellClass,
                                            stickyRightHeadCellClass,
                                            'text-right',
                                        )}
                                    >
                                        {t('Actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {externalCoaches.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={12}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {hasFilters
                                                ? t(
                                                      'No external coaches match your filters.',
                                                  )
                                                : t(
                                                      'No external coaches found.',
                                                  )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    externalCoaches.data.map((coach, index) => (
                                        <TableRow
                                            key={coach.id}
                                            data-state={
                                                selectedCoachIds.includes(
                                                    coach.id,
                                                )
                                                    ? 'selected'
                                                    : undefined
                                            }
                                            className="cursor-pointer hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                                            onClick={() =>
                                                router.visit(
                                                    `/external-coaches/${coach.id}`,
                                                )
                                            }
                                        >
                                            <TableCell
                                                style={{ left: 0 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                )}
                                            >
                                                <SelectionRowCheckbox
                                                    checked={selectedCoachIds.includes(
                                                        coach.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleCoachSelection(
                                                            coach.id,
                                                        )
                                                    }
                                                    label={`${t('Select external coach')} ${coach.name}`}
                                                />
                                            </TableCell>
                                            <TableCell
                                                style={{ left: 36 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                    'text-center font-mono text-muted-foreground tabular-nums',
                                                )}
                                            >
                                                {(externalCoaches.from ?? 1) +
                                                    index}
                                            </TableCell>
                                            <TableCell
                                                style={{ left: 80 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                )}
                                            >
                                                <MemberAvatar
                                                    photoPath={coach.photo_path}
                                                    name={coach.name}
                                                />
                                            </TableCell>
                                            <TableCell
                                                style={{ left: 132 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                )}
                                            >
                                                <span className="block truncate font-medium">
                                                    {coach.name}
                                                </span>
                                            </TableCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                <span className="block truncate">
                                                    {coach.email}
                                                </span>
                                            </TableCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                {coach.phone ?? '-'}
                                            </TableCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                <NameList
                                                    items={coach.sports}
                                                />
                                            </TableCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                <NameList
                                                    items={
                                                        coach.training_venues
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    listingCellClass,
                                                    'tabular-nums',
                                                )}
                                            >
                                                {coach.experience_years ?? '-'}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    listingCellClass,
                                                    'tabular-nums',
                                                )}
                                            >
                                                {
                                                    coach.active_coached_players_count
                                                }
                                            </TableCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className="px-1.5 py-0 text-[10px]"
                                                >
                                                    {t(coach.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    listingCellClass,
                                                    stickyRightBodyCellClass,
                                                )}
                                            >
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t('View')}
                                                        asChild
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        <Link
                                                            href={`/external-coaches/${coach.id}`}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
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
