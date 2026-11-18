import { Head, Link, router } from '@inertiajs/react';
import { Eye } from 'lucide-react';

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
import {
    useDebouncedSearch,
    useListingFilters,
} from '@/hooks/use-listing-filters';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Update = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    review_status: string;
    member: {
        full_name: string;
        member_code: string | null;
        pno: string | null;
    };
    external_coach: { name: string };
    sport: { name: string };
};

type Filters = {
    member_query: string | null;
    coach_query: string | null;
    sport_id: string | null;
    review_status: string | null;
    date_from: string | null;
    date_to: string | null;
};

type Props = {
    updates: PaginatedListing & { data: Update[] };
    filters: Filters;
    reviewStatuses: string[];
    sports: { id: number; name: string }[];
};

const PATH = '/external-coach-performance-updates';

export default function ExternalCoachPerformanceUpdatesIndex({
    updates,
    filters,
    reviewStatuses,
    sports,
}: Props) {
    const { t } = useTranslation();
    const { apply, clear } = useListingFilters(PATH);
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
            <Head title={t('External coach performance updates')} />
            <ListingLayout
                title={t('External coach performance updates')}
                description={t(
                    'Review progress updates submitted by external coaches.',
                )}
                search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: t('Search member name or PNO'),
                }}
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
                            label={t('Sport')}
                            activeLabel={sportName}
                            onClear={() => apply(filters, { sport_id: null })}
                        >
                            <SearchableOptionList
                                options={sports.map((sport) => ({
                                    value: String(sport.id),
                                    label: sport.name,
                                }))}
                                value={filters.sport_id ?? undefined}
                                onSelect={(sport_id) =>
                                    apply(filters, {
                                        sport_id: sport_id ?? null,
                                    })
                                }
                                searchPlaceholder={t('Search by sport')}
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Review status')}
                            activeLabel={
                                filters.review_status
                                    ? t(filters.review_status)
                                    : undefined
                            }
                            onClear={() =>
                                apply(filters, { review_status: null })
                            }
                        >
                            <OptionList
                                options={reviewStatuses.map((value) => ({
                                    value,
                                    label: t(value),
                                }))}
                                value={filters.review_status ?? undefined}
                                onSelect={(review_status) =>
                                    apply(filters, {
                                        review_status: review_status ?? null,
                                    })
                                }
                            />
                        </FilterPill>
                        <DateRangePill
                            label={t('Date')}
                            from={filters.date_from ?? ''}
                            to={filters.date_to ?? ''}
                            presets={dateRangePresets(t)}
                            onChange={(date_from, date_to) =>
                                apply(filters, { date_from, date_to })
                            }
                        />
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clear}
                resultCount={updates.total}
                footer={
                    <ListingPagination
                        paginator={updates}
                        itemLabel={t('performance updates')}
                        className="shrink-0 shadow-sm"
                    />
                }
            >
                <ListingTable minWidth={950}>
                    <colgroup>
                        <col className="w-11" />
                        <col className="w-[110px]" />
                        <col />
                        <col className="w-[200px]" />
                        <col className="w-[150px]" />
                        <col className="w-[80px]" />
                        <col className="w-[120px]" />
                        <col className="w-[130px]" />
                        <col className="w-[64px]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {[
                                'S.No.',
                                'Date',
                                'Member',
                                'External coach',
                                'Sport',
                                'Score',
                                'Level',
                                'Review status',
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
                                {t('Action')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {updates.data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    {t('No performance updates found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            updates.data.map((update, position) => (
                                <TableRow
                                    key={update.id}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() =>
                                        router.visit(`${PATH}/${update.id}`)
                                    }
                                >
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'text-center font-mono text-muted-foreground tabular-nums',
                                        )}
                                    >
                                        {(updates.from ?? 1) + position}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {formatDate(update.update_date)}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <span className="block truncate">
                                            <span className="font-medium">
                                                {update.member.full_name}
                                            </span>
                                            {update.member.pno && (
                                                <span className="ml-1.5 text-muted-foreground">
                                                    {update.member.pno}
                                                </span>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {update.external_coach.name}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {update.sport.name}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            'tabular-nums',
                                        )}
                                    >
                                        {update.performance_score ?? '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        {update.performance_level
                                            ? t(update.performance_level)
                                            : '-'}
                                    </TableCell>
                                    <TableCell className={listingCellClass}>
                                        <Badge
                                            variant="outline"
                                            className="px-1.5 py-0 text-[10px]"
                                        >
                                            {t(update.review_status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            listingCellClass,
                                            stickyRightBodyCellClass,
                                        )}
                                    >
                                        <div
                                            className="flex justify-end"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                title={t('Review')}
                                            >
                                                <Link
                                                    href={`${PATH}/${update.id}`}
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
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
