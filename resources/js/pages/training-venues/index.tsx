import { Head, Link, router } from '@inertiajs/react';
import { Eye, Pencil, Plus, Printer } from 'lucide-react';

import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import {
    FilterPill,
    OptionList,
    SearchableOptionList,
} from '@/components/data-table/filter-pill';
import {
    ListingLayout,
    ListingTable,
} from '@/components/data-table/listing-layout';
import {
    listingCellClass,
    listingHeadCellClass,
    stickyRightBodyCellClass,
    stickyRightHeadCellClass,
} from '@/components/data-table/table-primitives';
import { ListingPagination } from '@/components/listing-pagination';
import type { PaginatedListing } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuthorization } from '@/hooks/use-authorization';
import {
    openPrintView,
    useDebouncedSearch,
    useListingFilters,
} from '@/hooks/use-listing-filters';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Venue = {
    id: number;
    name: string;
    code: string | null;
    city: string | null;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    status: string;
    allowed_radius_meters: number;
};

type Filters = {
    q?: string | null;
    status?: string | null;
    city?: string | null;
    state?: string | null;
    coach_id?: string | null;
    sport_id?: string | null;
};
type Named = { id: number; name: string }[];

function statusLabel(value: string, t: (key: string) => string): string {
    return t(
        value
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    );
}

export default function TrainingVenuesIndex({
    trainingVenues,
    filters,
    statuses,
    cities,
    states,
    coaches,
    sports,
    perPage,
}: {
    trainingVenues: PaginatedListing & { data: Venue[] };
    filters: Filters;
    statuses: string[];
    cities: string[];
    states: string[];
    coaches: Named;
    sports: Named;
    perPage: number;
}) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canUpdate = can('training-venues.update');
    const { apply, clear } = useListingFilters(index.url(), {
        per_page: String(perPage),
    });
    const current = {
        q: filters.q,
        status: filters.status,
        city: filters.city,
        state: filters.state,
        coach_id: filters.coach_id,
        sport_id: filters.sport_id,
    };
    const [search, setSearch] = useDebouncedSearch(filters.q, (q) =>
        apply(current, { q }),
    );
    const hasFilters = Object.values(current).some(Boolean);

    return (
        <>
            <Head title={t('Training venues')} />
            <ListingLayout
                title={t('Training venues')}
                description={t(
                    'Manage external training locations and attendance radius settings.',
                )}
                search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: t('Search venue, code, or city'),
                }}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openPrintView(index.url(), current)}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                        {can('training-venues.create') && (
                            <Button asChild size="sm">
                                <Link href={create.url()}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Add venue')}
                                </Link>
                            </Button>
                        )}
                    </>
                }
                filters={
                    <>
                        <FilterPill
                            label={t('Status')}
                            activeLabel={
                                filters.status
                                    ? statusLabel(filters.status, t)
                                    : undefined
                            }
                            onClear={() => apply(current, { status: null })}
                        >
                            <OptionList
                                options={statuses.map((value) => ({
                                    value,
                                    label: statusLabel(value, t),
                                }))}
                                value={filters.status ?? undefined}
                                onSelect={(status) =>
                                    apply(current, { status: status ?? null })
                                }
                            />
                        </FilterPill>
                        {(
                            [
                                ['city', 'City', cities],
                                ['state', 'State', states],
                            ] as const
                        ).map(([key, label, values]) => (
                            <FilterPill
                                key={key}
                                label={t(label)}
                                activeLabel={filters[key] ?? undefined}
                                onClear={() => apply(current, { [key]: null })}
                            >
                                <SearchableOptionList
                                    options={values.map((value) => ({
                                        value,
                                        label: value,
                                    }))}
                                    value={filters[key] ?? undefined}
                                    searchPlaceholder={t('Search…')}
                                    onSelect={(value) =>
                                        apply(current, { [key]: value ?? null })
                                    }
                                />
                            </FilterPill>
                        ))}
                        {(
                            [
                                [
                                    'coach_id',
                                    'External coach',
                                    coaches,
                                    'Search coaches…',
                                ],
                                ['sport_id', 'Sport', sports, 'Search sports…'],
                            ] as const
                        ).map(([key, label, items, placeholder]) => (
                            <FilterPill
                                key={key}
                                label={t(label)}
                                activeLabel={
                                    items.find(
                                        (item) =>
                                            String(item.id) === filters[key],
                                    )?.name
                                }
                                onClear={() => apply(current, { [key]: null })}
                            >
                                <SearchableOptionList
                                    options={items.map((item) => ({
                                        value: String(item.id),
                                        label: item.name,
                                    }))}
                                    value={filters[key] ?? undefined}
                                    searchPlaceholder={t(placeholder)}
                                    onSelect={(value) =>
                                        apply(current, { [key]: value ?? null })
                                    }
                                />
                            </FilterPill>
                        ))}
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clear}
                resultCount={trainingVenues.total}
                footer={
                    <ListingPagination
                        paginator={trainingVenues}
                        itemLabel={t('venues')}
                        rowsPerPage={{
                            value: perPage,
                            options: [10, 25, 50, 100],
                            onChange: (value) =>
                                router.get(
                                    index.url(),
                                    {
                                        per_page: String(value),
                                        ...(filters.q && {
                                            'filter[q]': filters.q,
                                        }),
                                        ...(filters.status && {
                                            'filter[status]': filters.status,
                                        }),
                                    },
                                    {
                                        replace: true,
                                        preserveState: true,
                                    },
                                ),
                        }}
                        className="shrink-0 shadow-sm"
                    />
                }
            >
                <ListingTable minWidth={1000}>
                    <colgroup>
                        <col className="w-11" />
                        <col className="w-[260px]" />
                        <col className="w-[120px]" />
                        <col className="w-[130px]" />
                        <col />
                        <col className="w-[150px]" />
                        <col className="w-[90px]" />
                        <col className="w-[100px]" />
                        <col className="w-[84px]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {[
                                'S.No.',
                                'Venue',
                                'Code',
                                'City',
                                'Address',
                                'Coordinates',
                                'Radius',
                                'Status',
                            ].map((label, position) => (
                                <TableHead
                                    key={label}
                                    className={cn(
                                        listingHeadCellClass,
                                        position === 0 && 'text-center',
                                    )}
                                >
                                    {t(label)}
                                </TableHead>
                            ))}
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
                        {trainingVenues.data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    {t('No training venues found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            trainingVenues.data.map((venue, position) => (
                                <TableRow
                                    key={venue.id}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() =>
                                        router.visit(show.url(venue))
                                    }
                                >
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'text-center font-mono text-muted-foreground tabular-nums',
                                        )}
                                    >
                                        {(trainingVenues.from ?? 1) + position}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <span className="block truncate font-medium">
                                            {venue.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {venue.code || '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {venue.city || '-'}
                                    </TableCell>
                                    <TableCell
                                        className={listingCellClass}
                                        title={venue.address ?? undefined}
                                    >
                                        <span className="block truncate">
                                            {venue.address || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'font-mono tabular-nums',
                                        )}
                                    >
                                        {venue.latitude && venue.longitude
                                            ? `${Number(venue.latitude).toFixed(4)}, ${Number(venue.longitude).toFixed(4)}`
                                            : '-'}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'tabular-nums',
                                        )}
                                    >
                                        {venue.allowed_radius_meters} m
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <Badge
                                            variant={
                                                venue.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="px-1.5 py-0 text-[10px]"
                                        >
                                            {statusLabel(venue.status, t)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            stickyRightBodyCellClass,
                                        )}
                                    >
                                        <div
                                            className="flex items-center justify-end gap-0.5"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                title={t('View')}
                                            >
                                                <Link href={show.url(venue)}>
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
                                            {canUpdate && (
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="ghost"
                                                    title={t('Edit')}
                                                >
                                                    <Link
                                                        href={edit.url(venue)}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </ListingTable>
            </ListingLayout>
        </>
    );
}
