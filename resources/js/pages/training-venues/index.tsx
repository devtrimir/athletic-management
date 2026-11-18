import { Head, Link, router } from '@inertiajs/react';
import { Eye, Pencil, Plus } from 'lucide-react';

import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import { FilterPill, OptionList } from '@/components/data-table/filter-pill';
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
    status: string;
    allowed_radius_meters: number;
    district?: { name: string } | null;
    unit?: { name: string } | null;
};

type Filters = { q?: string | null; status?: string | null };

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
    perPage,
}: {
    trainingVenues: PaginatedListing & { data: Venue[] };
    filters: Filters;
    statuses: string[];
    perPage: number;
}) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canUpdate = can('training-venues.update');
    const { apply, clear } = useListingFilters(index.url(), {
        per_page: String(perPage),
    });
    const current = { q: filters.q, status: filters.status };
    const [search, setSearch] = useDebouncedSearch(filters.q, (q) =>
        apply(current, { q }),
    );
    const hasFilters = Boolean(filters.q || filters.status);

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
                    can('training-venues.create') && (
                        <Button asChild size="sm">
                            <Link href={create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add venue')}
                            </Link>
                        </Button>
                    )
                }
                filters={
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
                <ListingTable minWidth={900}>
                    <colgroup>
                        <col className="w-11" />
                        <col />
                        <col className="w-[110px]" />
                        <col className="w-[200px]" />
                        <col className="w-[220px]" />
                        <col className="w-[100px]" />
                        <col className="w-[100px]" />
                        <col className="w-[84px]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {[
                                'S.No.',
                                'Venue',
                                'Code',
                                'City / district',
                                'Unit',
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
                                    colSpan={8}
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
                                        {venue.city ||
                                            venue.district?.name ||
                                            '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {venue.unit?.name || '-'}
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
