import { Head, Link, router } from '@inertiajs/react';
import { Eye, Pencil, Plus } from 'lucide-react';

import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import {
    DateRangePill,
    FilterPill,
    OptionList,
    SearchableOptionList,
    TextFilterPill,
    dateRangePresets,
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
    useDebouncedSearch,
    useListingFilters,
} from '@/hooks/use-listing-filters';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Assignment = {
    id: number;
    start_date: string;
    end_date: string;
    status: string;
    member?: { full_name: string; pno: string | null } | null;
    external_coach?: { name: string } | null;
    training_venue?: { name: string } | null;
    sport?: { name: string } | null;
};

type Filters = {
    member_query?: string;
    coach_query?: string;
    status?: string;
    sport_id?: string;
    start_date_from?: string;
    start_date_to?: string;
};

type Props = {
    assignments: PaginatedListing & { data: Assignment[] };
    filters: Filters;
    statuses: string[];
    sports: { id: number; name: string }[];
};

export default function ExternalCoachingAssignmentsIndex({
    assignments,
    filters,
    statuses,
    sports,
}: Props) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canUpdate = can('external-coaching-assignments.update');
    const { apply, clear } = useListingFilters(index.url());
    const [search, setSearch] = useDebouncedSearch(
        filters.member_query,
        (member_query) => apply(filters, { member_query }),
    );
    const hasFilters = Object.values(filters).some(Boolean);
    const sportName = sports.find(
        (sport) => String(sport.id) === filters.sport_id,
    )?.name;

    return (
        <>
            <Head title={t('External coaching assignments')} />
            <ListingLayout
                title={t('External coaching assignments')}
                description={t(
                    'Manage member assignments to external coaches and venues.',
                )}
                search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: t('Search member by name or PNO'),
                }}
                actions={
                    can('external-coaching-assignments.create') && (
                        <Button asChild size="sm">
                            <Link href={create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add assignment')}
                            </Link>
                        </Button>
                    )
                }
                filters={
                    <>
                        <TextFilterPill
                            label={t('Coach')}
                            value={filters.coach_query ?? ''}
                            placeholder={t('Coach name or phone')}
                            onApply={(coach_query) =>
                                apply(filters, { coach_query })
                            }
                        />
                        <FilterPill
                            label={t('Status')}
                            activeLabel={
                                filters.status ? t(filters.status) : undefined
                            }
                            onClear={() => apply(filters, { status: null })}
                        >
                            <OptionList
                                options={statuses.map((value) => ({
                                    value,
                                    label: t(value),
                                }))}
                                value={filters.status}
                                onSelect={(status) =>
                                    apply(filters, { status: status ?? null })
                                }
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Sport')}
                            activeLabel={sportName}
                            onClear={() => apply(filters, { sport_id: null })}
                        >
                            <SearchableOptionList
                                options={sports.map((sport) => ({
                                    value: String(sport.id),
                                    label: sport.name,
                                }))}
                                value={filters.sport_id}
                                onSelect={(sport_id) =>
                                    apply(filters, {
                                        sport_id: sport_id ?? null,
                                    })
                                }
                                searchPlaceholder={t('Search by sport')}
                            />
                        </FilterPill>
                        <DateRangePill
                            label={t('Start date')}
                            from={filters.start_date_from ?? ''}
                            to={filters.start_date_to ?? ''}
                            presets={dateRangePresets(t)}
                            onChange={(start_date_from, start_date_to) =>
                                apply(filters, {
                                    start_date_from,
                                    start_date_to,
                                })
                            }
                        />
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clear}
                resultCount={assignments.total}
                footer={
                    <ListingPagination
                        paginator={assignments}
                        itemLabel={t('assignments')}
                        className="shrink-0 shadow-sm"
                    />
                }
            >
                <ListingTable minWidth={1050}>
                    <colgroup>
                        <col className="w-11" />
                        <col />
                        <col className="w-[190px]" />
                        <col className="w-[200px]" />
                        <col className="w-[130px]" />
                        <col className="w-[100px]" />
                        <col className="w-[100px]" />
                        <col className="w-[100px]" />
                        <col className="w-[84px]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {[
                                'S.No.',
                                'Member',
                                'Coach',
                                'Venue',
                                'Sport',
                                'Start',
                                'End',
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
                        {assignments.data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    {t(
                                        'No external coaching assignments found.',
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            assignments.data.map((assignment, position) => (
                                <TableRow
                                    key={assignment.id}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() =>
                                        router.visit(show.url(assignment))
                                    }
                                >
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'text-center font-mono text-muted-foreground tabular-nums',
                                        )}
                                    >
                                        {(assignments.from ?? 1) + position}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <span className="block truncate">
                                            <span className="font-medium">
                                                {assignment.member?.full_name ??
                                                    t('Unknown member')}
                                            </span>
                                            {assignment.member?.pno && (
                                                <span className="ml-1.5 text-muted-foreground">
                                                    {assignment.member.pno}
                                                </span>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {assignment.external_coach?.name ?? '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {assignment.training_venue?.name ?? '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {assignment.sport?.name ?? '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {formatDate(assignment.start_date)}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {formatDate(assignment.end_date)}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <Badge
                                            variant={
                                                assignment.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="px-1.5 py-0 text-[10px]"
                                        >
                                            {t(assignment.status)}
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
                                                <Link
                                                    href={show.url(assignment)}
                                                >
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
                                                        href={edit.url(
                                                            assignment,
                                                        )}
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
