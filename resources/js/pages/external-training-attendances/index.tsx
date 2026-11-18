import { Head, Link } from '@inertiajs/react';
import { ClipboardCheck, Download, Lock, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
    DateRangePill,
    FilterPill,
    OptionList,
    SearchableOptionList,
    TextFilterPill,
    isoDate,
} from '@/components/data-table/filter-pill';
import {
    ListingLayout,
    ListingTable,
} from '@/components/data-table/listing-layout';
import {
    SelectionHeaderCheckbox,
    SelectionRowCheckbox,
    listingCellClass,
    listingHeadCellClass,
    stickyLeftBodyCellClass,
    stickyLeftHeadCellClass,
    stickyRightBodyCellClass,
    stickyRightHeadCellClass,
} from '@/components/data-table/table-primitives';
import { ListingPagination } from '@/components/listing-pagination';
import type { PaginatedListing } from '@/components/listing-pagination';
import { MemberPhotoPreview } from '@/components/members/member-photo-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    openPrintView,
    useDebouncedSearch,
    useListingFilters,
} from '@/hooks/use-listing-filters';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Attendance = {
    id: number;
    attendance_date: string;
    attendance_status: string;
    corrected_attendance_status: string | null;
    geo_status: string;
    review_status: string;
    distance_from_venue_meters: string | null;
    flag_reason: string | null;
    submitted_at: string;
    member: {
        id: number;
        photo_path: string | null;
        full_name: string;
        member_code: string | null;
        pno: string | null;
    };
    external_coach: { id: number; name: string };
    training_venue: { name: string };
    assignment: { sport: { name: string } | null } | null;
    reviewer: { name: string } | null;
};

type PaginatedAttendances = PaginatedListing & {
    data: Attendance[];
    per_page?: number;
};

type Sport = {
    id: number;
    name: string;
};

type ExternalCoach = {
    id: number;
    name: string;
};

type Filters = {
    q: string | null;
    member_query: string | null;
    coach_query: string | null;
    venue_query: string | null;
    sport_query: string | null;
    external_coach_id: string | null;
    training_venue_id: string | null;
    sport_id: string | null;
    date_from: string | null;
    date_to: string | null;
    attendance_status: string | null;
    geo_status: string | null;
    review_status: string | null;
    flagged_only: string | null;
    outside_radius_only: string | null;
    missing_location_only: string | null;
    low_accuracy_only: string | null;
};

type Props = {
    attendances: PaginatedAttendances;
    filters: Filters;
    attendanceStatuses: string[];
    geoStatuses: string[];
    reviewStatuses: string[];
    sports: Sport[];
    externalCoaches: ExternalCoach[];
    canReviewAttendanceDetails: boolean;
    trainingVenues?: { id: number; name: string }[];
};

type ExportColumn = {
    key: string;
    label: string;
};

const exportColumnGroups: { label: string; columns: ExportColumn[] }[] = [
    {
        label: 'Core',
        columns: [
            { key: 'record_id', label: 'Record ID' },
            { key: 'date', label: 'Date' },
            { key: 'submitted_at', label: 'Submitted At' },
            { key: 'attendance_status', label: 'Attendance Status' },
            {
                key: 'corrected_attendance_status',
                label: 'Corrected Attendance Status',
            },
            { key: 'geo_status', label: 'Geo Status' },
            { key: 'review_status', label: 'Review Status' },
        ],
    },
    {
        label: 'People',
        columns: [
            { key: 'member', label: 'Member' },
            { key: 'pno', label: 'PNO' },
            { key: 'external_coach', label: 'External Coach' },
            { key: 'coach_phone', label: 'Coach Phone' },
            { key: 'coach_email', label: 'Coach Email' },
        ],
    },
    {
        label: 'Training',
        columns: [
            { key: 'assignment_id', label: 'Assignment ID' },
            { key: 'venue', label: 'Venue' },
            { key: 'venue_snapshot', label: 'Venue Snapshot' },
            { key: 'sport', label: 'Sport' },
            { key: 'assignment_status', label: 'Assignment Status' },
            { key: 'assignment_start_date', label: 'Assignment Start Date' },
            { key: 'assignment_end_date', label: 'Assignment End Date' },
            { key: 'training_start_time', label: 'Training Start Time' },
            { key: 'training_end_time', label: 'Training End Time' },
            { key: 'attendance_mode', label: 'Attendance Mode' },
        ],
    },
    {
        label: 'Review',
        columns: [
            { key: 'flag_reason', label: 'Flag Reason' },
            { key: 'coach_remarks', label: 'Coach Remarks' },
            { key: 'review_remarks', label: 'Review Remarks' },
            { key: 'reviewed_by', label: 'Reviewed By' },
            { key: 'reviewed_at', label: 'Reviewed At' },
        ],
    },
    {
        label: 'Location',
        columns: [
            { key: 'distance_meters', label: 'Distance (m)' },
            { key: 'submitted_latitude', label: 'Submitted Latitude' },
            { key: 'submitted_longitude', label: 'Submitted Longitude' },
            {
                key: 'submitted_gps_accuracy_m',
                label: 'Submitted GPS Accuracy (m)',
            },
            {
                key: 'venue_latitude_snapshot',
                label: 'Venue Latitude Snapshot',
            },
            {
                key: 'venue_longitude_snapshot',
                label: 'Venue Longitude Snapshot',
            },
            { key: 'allowed_radius_meters', label: 'Allowed Radius (m)' },
        ],
    },
    {
        label: 'Photo & Device',
        columns: [
            { key: 'photo_file_name', label: 'Photo File Name' },
            { key: 'photo_source', label: 'Photo Source' },
            { key: 'photo_mime_type', label: 'Photo MIME Type' },
            { key: 'photo_size_bytes', label: 'Photo Size (bytes)' },
            { key: 'photo_dimensions', label: 'Photo Dimensions' },
            { key: 'photo_uploaded_at', label: 'Photo Uploaded At' },
            { key: 'submitted_source', label: 'Submitted Source' },
            { key: 'ip_address', label: 'IP Address' },
            { key: 'browser_timezone', label: 'Browser Timezone' },
        ],
    },
    {
        label: 'Check In/Out',
        columns: [
            { key: 'check_in_at', label: 'Check In At' },
            { key: 'check_in_latitude', label: 'Check In Latitude' },
            { key: 'check_in_longitude', label: 'Check In Longitude' },
            {
                key: 'check_in_gps_accuracy_m',
                label: 'Check In GPS Accuracy (m)',
            },
            { key: 'check_in_distance_meters', label: 'Check In Distance (m)' },
            { key: 'check_in_geo_status', label: 'Check In Geo Status' },
            { key: 'check_out_at', label: 'Check Out At' },
            { key: 'check_out_latitude', label: 'Check Out Latitude' },
            { key: 'check_out_longitude', label: 'Check Out Longitude' },
            {
                key: 'check_out_gps_accuracy_m',
                label: 'Check Out GPS Accuracy (m)',
            },
            {
                key: 'check_out_distance_meters',
                label: 'Check Out Distance (m)',
            },
            { key: 'check_out_geo_status', label: 'Check Out Geo Status' },
            { key: 'duration_minutes', label: 'Duration (minutes)' },
        ],
    },
];

const defaultExportColumns = [
    'record_id',
    'date',
    'submitted_at',
    'member',
    'pno',
    'external_coach',
    'venue',
    'sport',
    'attendance_status',
    'corrected_attendance_status',
    'geo_status',
    'review_status',
    'distance_meters',
    'reviewed_by',
];

const AUTO_MARKED_ATTENDANCE_REASON = 'coach_not_submitted_attendance';

type SpanMeta = {
    span: number;
    start: boolean;
};

type RowSpanMeta = {
    source: SpanMeta;
    coach: SpanMeta;
    venue: SpanMeta;
    sport: SpanMeta;
    member: SpanMeta;
    attendance: SpanMeta;
    geoStatus: SpanMeta;
    reviewAction: SpanMeta;
};

function computeRowSpans(attendances: Attendance[]): RowSpanMeta[] {
    const result: RowSpanMeta[] = attendances.map(() => ({
        source: { span: 1, start: true },
        coach: { span: 1, start: true },
        venue: { span: 1, start: true },
        sport: { span: 1, start: true },
        member: { span: 1, start: true },
        attendance: { span: 1, start: true },
        geoStatus: { span: 1, start: true },
        reviewAction: { span: 1, start: true },
    }));

    const columns: {
        key: keyof RowSpanMeta;
        value: (attendance: Attendance) => string | number | null;
    }[] = [
        {
            key: 'source',
            value: (a) =>
                a.flag_reason === AUTO_MARKED_ATTENDANCE_REASON
                    ? 'auto'
                    : 'manual',
        },
        { key: 'coach', value: (a) => a.external_coach.id },
        { key: 'venue', value: (a) => a.training_venue.name },
        { key: 'sport', value: (a) => a.assignment?.sport?.name ?? null },
        { key: 'member', value: (a) => a.member.id },
        { key: 'attendance', value: (a) => a.attendance_status },
        { key: 'geoStatus', value: (a) => a.geo_status },
        { key: 'reviewAction', value: (a) => a.review_status },
    ];

    for (const { key, value } of columns) {
        let groupStart = 0;

        for (let i = 0; i < attendances.length; i++) {
            const isLast = i === attendances.length - 1;
            const current = value(attendances[i]);
            const next = isLast ? null : value(attendances[i + 1]);
            const breaks = isLast || current !== next;

            if (breaks) {
                for (let j = groupStart; j <= i; j++) {
                    result[j][key] = {
                        span: i - groupStart + 1,
                        start: j === groupStart,
                    };
                }

                groupStart = i + 1;
            }
        }
    }

    return result;
}

const PATH = '/external-training-attendances';

/** Review-queue shortcuts map onto one filter each; 'pending' is a review_status. */
const QUEUE_FILTER: Record<string, string> = {
    flagged: 'flagged_only',
    outside_radius: 'outside_radius_only',
    missing_location: 'missing_location_only',
    low_accuracy: 'low_accuracy_only',
};

const QUEUE_LABELS: Record<string, string> = {
    pending: 'Pending review',
    flagged: 'Geo flagged',
    outside_radius: 'Outside radius',
    missing_location: 'Missing location',
    low_accuracy: 'Low accuracy',
};

/** Merged cell that only renders on the first row of its group. */
function SpanCell({
    meta,
    className,
    children,
}: {
    meta: SpanMeta;
    className?: string;
    children: ReactNode;
}) {
    return meta.start ? (
        <TableCell
            rowSpan={meta.span}
            className={cn(listingCellClass, className)}
        >
            {children}
        </TableCell>
    ) : null;
}

export default function ExternalTrainingAttendanceIndex({
    attendances,
    filters,
    attendanceStatuses,
    geoStatuses,
    reviewStatuses,
    sports,
    externalCoaches,
    canReviewAttendanceDetails,
    trainingVenues = [],
}: Props) {
    const { t } = useTranslation();
    const perPage = attendances.per_page ?? 25;
    const { apply, clear } = useListingFilters(PATH, {
        per_page: String(perPage),
    });
    const [search, setSearch] = useDebouncedSearch(filters.q, (q) =>
        apply(filters, { q }),
    );
    const [outputOpen, setOutputOpen] = useState(false);
    const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<
        number[]
    >([]);
    const [selectedOutputColumns, setSelectedOutputColumns] =
        useState<string[]>(defaultExportColumns);
    const rowSpanMeta = useMemo(
        () => computeRowSpans(attendances.data),
        [attendances.data],
    );
    const hasFilters = Object.values(filters).some(Boolean);
    const reviewQueue = reviewQueueFromFilters(filters);
    const pageAttendanceIds = attendances.data.map(
        (attendance) => attendance.id,
    );
    const selectedOnPageCount = pageAttendanceIds.filter((id) =>
        selectedAttendanceIds.includes(id),
    ).length;
    const allPageRowsSelected =
        pageAttendanceIds.length > 0 &&
        selectedOnPageCount === pageAttendanceIds.length;
    const exportUrl = exportUrlFor(
        selectedOutputColumns,
        selectedAttendanceIds,
    );
    const nameOf = (list: { id: number; name: string }[], id: string | null) =>
        list.find((item) => String(item.id) === id)?.name;
    const options = (list: { id: number; name: string }[]) =>
        list.map((item) => ({ value: String(item.id), label: item.name }));
    const statusOptions = (list: string[]) =>
        list.map((value) => ({ value, label: t(value) }));

    function applyQueue(queue: string | undefined) {
        apply(filters, {
            flagged_only: null,
            outside_radius_only: null,
            missing_location_only: null,
            low_accuracy_only: null,
            review_status:
                queue === 'pending' ? 'pending' : filters.review_status,
            ...(queue && QUEUE_FILTER[queue]
                ? { [QUEUE_FILTER[queue]]: '1' }
                : {}),
        });
    }

    const datePresets = [
        {
            label: t('Today'),
            range: (): [string, string] => [
                isoDate(new Date()),
                isoDate(new Date()),
            ],
        },
        {
            label: t('This week'),
            range: (): [string, string] => {
                const start = new Date();
                start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

                return [isoDate(start), isoDate(new Date())];
            },
        },
        {
            label: t('This month'),
            range: (): [string, string] => {
                const start = new Date();
                start.setDate(1);

                return [isoDate(start), isoDate(new Date())];
            },
        },
    ];

    function toggleOutputColumn(column: string, checked: boolean): void {
        setSelectedOutputColumns((current) => {
            if (checked) {
                return Array.from(new Set([...current, column]));
            }

            return current.length === 1
                ? current
                : current.filter((item) => item !== column);
        });
    }

    function toggleAttendanceSelection(id: number, checked: boolean): void {
        setSelectedAttendanceIds((current) => {
            if (checked) {
                return Array.from(new Set([...current, id]));
            }

            return current.filter((selectedId) => selectedId !== id);
        });
    }

    function togglePageSelection(checked: boolean): void {
        setSelectedAttendanceIds((current) => {
            if (checked) {
                return Array.from(new Set([...current, ...pageAttendanceIds]));
            }

            return current.filter((id) => !pageAttendanceIds.includes(id));
        });
    }

    function setOutputGroup(columns: string[], checked: boolean): void {
        setSelectedOutputColumns((current) => {
            if (checked) {
                return Array.from(new Set([...current, ...columns]));
            }

            const next = current.filter((column) => !columns.includes(column));

            return next.length > 0 ? next : current;
        });
    }

    return (
        <>
            <Head title={t('External training attendance')} />

            <ListingLayout
                title={t('External training attendance')}
                description={t(
                    'Review submitted external training proof and geo flags.',
                )}
                search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: t('Member, PNO, coach, venue, sport...'),
                }}
                actions={
                    <>
                        {selectedAttendanceIds.length > 0 && (
                            <Badge variant="secondary" className="rounded-full">
                                {selectedAttendanceIds.length} {t('selected')}
                            </Badge>
                        )}
                        <Dialog open={outputOpen} onOpenChange={setOutputOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                >
                                    <Download className="size-4" />
                                    {t('Export / Print')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>
                                        {t('Choose columns')}
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="flex flex-wrap items-center gap-2 border-b pb-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setSelectedOutputColumns(
                                                allOutputColumns(),
                                            )
                                        }
                                    >
                                        {t('Select all')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setSelectedOutputColumns(
                                                defaultExportColumns,
                                            )
                                        }
                                    >
                                        {t('Default')}
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedOutputColumns.length}{' '}
                                        {t('columns selected')}
                                    </span>
                                </div>

                                <div className="grid gap-3 py-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {exportColumnGroups.map((group) => {
                                        const groupColumns = group.columns.map(
                                            (column) => column.key,
                                        );
                                        const allChecked = groupColumns.every(
                                            (column) =>
                                                selectedOutputColumns.includes(
                                                    column,
                                                ),
                                        );

                                        return (
                                            <section
                                                key={group.label}
                                                className="rounded-lg border bg-muted/10 p-3"
                                            >
                                                <label className="flex items-center gap-2 text-sm font-semibold">
                                                    <Checkbox
                                                        checked={allChecked}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            setOutputGroup(
                                                                groupColumns,
                                                                checked ===
                                                                    true,
                                                            )
                                                        }
                                                    />
                                                    {t(group.label)}
                                                </label>
                                                <div className="mt-3 grid gap-2">
                                                    {group.columns.map(
                                                        (column) => (
                                                            <label
                                                                key={column.key}
                                                                className="flex items-center gap-2 text-xs text-muted-foreground"
                                                            >
                                                                <Checkbox
                                                                    checked={selectedOutputColumns.includes(
                                                                        column.key,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleOutputColumn(
                                                                            column.key,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                />
                                                                {t(
                                                                    column.label,
                                                                )}
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button asChild variant="outline">
                                        <a href={exportUrl}>
                                            <Download className="size-4" />
                                            {t('Export selected')}
                                        </a>
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            openPrintView(
                                                PATH,
                                                filters,
                                                selectedAttendanceIds,
                                            )
                                        }
                                    >
                                        <Printer className="size-4" />
                                        {t('Open print view')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                }
                filters={
                    <>
                        <FilterPill
                            label={t('Review queue')}
                            activeLabel={
                                reviewQueue !== 'all'
                                    ? t(QUEUE_LABELS[reviewQueue])
                                    : undefined
                            }
                            onClear={() => applyQueue(undefined)}
                        >
                            <OptionList
                                options={Object.entries(QUEUE_LABELS).map(
                                    ([value, label]) => ({
                                        value,
                                        label: t(label),
                                    }),
                                )}
                                value={
                                    reviewQueue === 'all'
                                        ? undefined
                                        : reviewQueue
                                }
                                onSelect={applyQueue}
                            />
                        </FilterPill>
                        <DateRangePill
                            label={t('Date')}
                            from={filters.date_from ?? ''}
                            to={filters.date_to ?? ''}
                            presets={datePresets}
                            onChange={(date_from, date_to) =>
                                apply(filters, { date_from, date_to })
                            }
                        />
                        <FilterPill
                            label={t('Coach')}
                            activeLabel={nameOf(
                                externalCoaches,
                                filters.external_coach_id,
                            )}
                            onClear={() =>
                                apply(filters, { external_coach_id: null })
                            }
                        >
                            <SearchableOptionList
                                options={options(externalCoaches)}
                                value={filters.external_coach_id ?? undefined}
                                onSelect={(id) =>
                                    apply(filters, {
                                        external_coach_id: id ?? null,
                                    })
                                }
                                searchPlaceholder={t('Search coach')}
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Venue')}
                            activeLabel={nameOf(
                                trainingVenues,
                                filters.training_venue_id,
                            )}
                            onClear={() =>
                                apply(filters, { training_venue_id: null })
                            }
                        >
                            <SearchableOptionList
                                options={options(trainingVenues)}
                                value={filters.training_venue_id ?? undefined}
                                onSelect={(id) =>
                                    apply(filters, {
                                        training_venue_id: id ?? null,
                                    })
                                }
                                searchPlaceholder={t('Search venue')}
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Sport')}
                            activeLabel={nameOf(sports, filters.sport_id)}
                            onClear={() => apply(filters, { sport_id: null })}
                        >
                            <SearchableOptionList
                                options={options(sports)}
                                value={filters.sport_id ?? undefined}
                                onSelect={(id) =>
                                    apply(filters, { sport_id: id ?? null })
                                }
                                searchPlaceholder={t('Search by sport')}
                            />
                        </FilterPill>
                        <TextFilterPill
                            label={t('Member')}
                            value={filters.member_query ?? ''}
                            placeholder={t('Name, code, or PNO')}
                            onApply={(member_query) =>
                                apply(filters, { member_query })
                            }
                        />
                        <FilterPill
                            label={t('Attendance')}
                            activeLabel={
                                filters.attendance_status
                                    ? t(filters.attendance_status)
                                    : undefined
                            }
                            onClear={() =>
                                apply(filters, { attendance_status: null })
                            }
                        >
                            <OptionList
                                options={statusOptions(attendanceStatuses)}
                                value={filters.attendance_status ?? undefined}
                                onSelect={(value) =>
                                    apply(filters, {
                                        attendance_status: value ?? null,
                                    })
                                }
                            />
                        </FilterPill>
                        <FilterPill
                            label={t('Geo status')}
                            activeLabel={
                                filters.geo_status
                                    ? t(filters.geo_status)
                                    : undefined
                            }
                            onClear={() => apply(filters, { geo_status: null })}
                        >
                            <OptionList
                                options={statusOptions(geoStatuses)}
                                value={filters.geo_status ?? undefined}
                                onSelect={(value) =>
                                    apply(filters, {
                                        geo_status: value ?? null,
                                    })
                                }
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
                                options={statusOptions(reviewStatuses)}
                                value={filters.review_status ?? undefined}
                                onSelect={(value) =>
                                    apply(filters, {
                                        review_status: value ?? null,
                                    })
                                }
                            />
                        </FilterPill>
                    </>
                }
                hasFilters={hasFilters}
                onClearFilters={clear}
                resultCount={attendances.total}
                footer={
                    <ListingPagination
                        paginator={attendances}
                        itemLabel={t('attendances')}
                        rowsPerPage={{
                            value: perPage,
                            options: [10, 25, 50, 100],
                            onChange: (value) => {
                                const params = new URLSearchParams(
                                    window.location.search,
                                );
                                params.set('per_page', String(value));
                                params.delete('page');
                                window.location.assign(
                                    `${PATH}?${params.toString()}`,
                                );
                            },
                        }}
                        className="shrink-0 shadow-sm"
                    />
                }
            >
                <div id="external-training-attendance-print" className="h-full">
                    <ListingTable
                        minWidth={1600}
                        className="table-auto"
                        centered
                    >
                        <colgroup>
                            <col className="w-9" />
                            <col className="w-[52px]" />
                            <col className="w-[96px]" />
                            <col className="w-[112px]" />
                            <col className="w-[56px]" />
                            <col />
                            <col className="w-[180px]" />
                            <col className="min-w-[200px]" />
                            <col className="w-[130px]" />
                            <col className="w-[100px]" />
                            <col className="w-[140px]" />
                            <col className="w-[130px]" />
                            <col className="w-[140px]" />
                            <col className="w-[96px]" />
                            <col className="w-[104px]" />
                        </colgroup>
                        <TableHeader className="sticky top-0 z-20">
                            <TableRow className="hover:bg-transparent">
                                <TableHead
                                    style={{ left: 0 }}
                                    className={cn(
                                        listingHeadCellClass,
                                        stickyLeftHeadCellClass,
                                        'print:hidden',
                                    )}
                                >
                                    <SelectionHeaderCheckbox
                                        checked={allPageRowsSelected}
                                        indeterminate={
                                            !allPageRowsSelected &&
                                            selectedOnPageCount > 0
                                        }
                                        onCheckedChange={togglePageSelection}
                                        label={t(
                                            'Select all visible attendances',
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
                                    style={{ left: 88 }}
                                    className={cn(
                                        listingHeadCellClass,
                                        stickyLeftHeadCellClass,
                                    )}
                                >
                                    {t('Date')}
                                </TableHead>
                                {[
                                    'Entry source',
                                    'Photo',
                                    'Member',
                                    'External coach',
                                    'Venue',
                                    'Sport',
                                    'Attendance',
                                    'Corrected status',
                                    'Geo status',
                                    'Review action',
                                ].map((label) => (
                                    <TableHead
                                        key={label}
                                        className={listingHeadCellClass}
                                    >
                                        {t(label)}
                                    </TableHead>
                                ))}
                                <TableHead
                                    className={cn(
                                        listingHeadCellClass,
                                        'text-right',
                                    )}
                                >
                                    {t('Distance')}
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
                            {attendances.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={15}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        {t('No attendance records found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attendances.data.map((attendance, index) => {
                                    const spans = rowSpanMeta[index];
                                    const selected =
                                        selectedAttendanceIds.includes(
                                            attendance.id,
                                        );
                                    const autoMarked =
                                        attendance.flag_reason ===
                                        AUTO_MARKED_ATTENDANCE_REASON;
                                    const pill =
                                        'rounded-full px-1.5 py-0 text-[10px] font-semibold';

                                    return (
                                        <TableRow
                                            key={attendance.id}
                                            data-attendance-id={attendance.id}
                                            data-state={
                                                selected
                                                    ? 'selected'
                                                    : undefined
                                            }
                                            className="hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                                        >
                                            <TableCell
                                                style={{ left: 0 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                    'print:hidden',
                                                )}
                                            >
                                                <SelectionRowCheckbox
                                                    checked={selected}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleAttendanceSelection(
                                                            attendance.id,
                                                            checked,
                                                        )
                                                    }
                                                    label={t(
                                                        'Select attendance',
                                                    )}
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
                                                {(attendances.from ?? 1) +
                                                    index}
                                            </TableCell>
                                            <TableCell
                                                style={{ left: 88 }}
                                                className={cn(
                                                    listingCellClass,
                                                    stickyLeftBodyCellClass,
                                                    'font-medium whitespace-nowrap',
                                                )}
                                            >
                                                {formatDate(
                                                    attendance.attendance_date,
                                                )}
                                            </TableCell>
                                            <SpanCell meta={spans.source}>
                                                <Badge
                                                    variant={
                                                        autoMarked
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    className={cn(
                                                        pill,
                                                        autoMarked &&
                                                            'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100',
                                                    )}
                                                >
                                                    {attendanceMarkingSource(
                                                        attendance.flag_reason,
                                                        t,
                                                    )}
                                                </Badge>
                                            </SpanCell>
                                            <SpanCell meta={spans.member}>
                                                <div className="flex justify-center">
                                                    <MemberPhotoPreview
                                                        photoPath={
                                                            attendance.member
                                                                .photo_path
                                                        }
                                                        name={
                                                            attendance.member
                                                                .full_name
                                                        }
                                                    />
                                                </div>
                                            </SpanCell>
                                            <SpanCell
                                                meta={spans.member}
                                                className="max-w-[320px] whitespace-nowrap"
                                            >
                                                <Link
                                                    href={`/members/${attendance.member.id}`}
                                                    className="block truncate font-semibold hover:text-primary hover:underline"
                                                >
                                                    {
                                                        attendance.member
                                                            .full_name
                                                    }
                                                </Link>
                                                {attendance.member.pno && (
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {attendance.member.pno}
                                                    </div>
                                                )}
                                            </SpanCell>
                                            <SpanCell meta={spans.coach}>
                                                <Link
                                                    href={`/external-coaches/${attendance.external_coach.id}`}
                                                    className="block truncate font-medium text-primary hover:underline"
                                                >
                                                    {
                                                        attendance
                                                            .external_coach.name
                                                    }
                                                </Link>
                                            </SpanCell>
                                            <SpanCell
                                                meta={spans.venue}
                                                className="truncate"
                                            >
                                                {attendance.training_venue.name}
                                            </SpanCell>
                                            <SpanCell
                                                meta={spans.sport}
                                                className="truncate"
                                            >
                                                {attendance.assignment?.sport
                                                    ?.name ?? '-'}
                                            </SpanCell>
                                            <SpanCell meta={spans.attendance}>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        pill,
                                                        attendanceStatusBadgeClass(
                                                            attendance.attendance_status,
                                                        ),
                                                    )}
                                                >
                                                    {t(
                                                        attendance.attendance_status,
                                                    )}
                                                </Badge>
                                            </SpanCell>
                                            <TableCell
                                                className={listingCellClass}
                                            >
                                                {attendance.review_status ===
                                                    'corrected' &&
                                                attendance.corrected_attendance_status ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            pill,
                                                            attendanceStatusBadgeClass(
                                                                attendance.corrected_attendance_status,
                                                            ),
                                                        )}
                                                    >
                                                        {t(
                                                            attendance.corrected_attendance_status,
                                                        )}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <SpanCell meta={spans.geoStatus}>
                                                <Badge
                                                    variant={
                                                        attendance.geo_status ===
                                                        'valid'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                    }
                                                    className={pill}
                                                >
                                                    {t(attendance.geo_status)}
                                                </Badge>
                                            </SpanCell>
                                            <SpanCell meta={spans.reviewAction}>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        pill,
                                                        reviewActionBadgeClass(
                                                            attendance.review_status,
                                                        ),
                                                    )}
                                                >
                                                    {reviewActionLabel(
                                                        attendance.review_status,
                                                        t,
                                                    )}
                                                </Badge>
                                            </SpanCell>
                                            <TableCell
                                                className={cn(
                                                    listingCellClass,
                                                    'text-right tabular-nums',
                                                )}
                                            >
                                                {attendance.distance_from_venue_meters ??
                                                    '-'}{' '}
                                                m
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    listingCellClass,
                                                    stickyRightBodyCellClass,
                                                )}
                                            >
                                                <div className="flex justify-end">
                                                    {canReviewAttendanceDetails ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            className="h-6 gap-1 px-2 text-[11px]"
                                                        >
                                                            <Link
                                                                href={`${PATH}/${attendance.id}`}
                                                            >
                                                                <ClipboardCheck className="size-3.5" />
                                                                {t('Review')}
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled
                                                            title={t(
                                                                'No access',
                                                            )}
                                                            className="h-6 gap-1 px-2 text-[11px]"
                                                        >
                                                            <Lock className="size-3.5" />
                                                            {t('Review')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </ListingTable>
                </div>
            </ListingLayout>
        </>
    );
}

function reviewQueueFromFilters(filters: Filters): string {
    if (filters.outside_radius_only === '1') {
        return 'outside_radius';
    }

    if (filters.missing_location_only === '1') {
        return 'missing_location';
    }

    if (filters.low_accuracy_only === '1') {
        return 'low_accuracy';
    }

    if (filters.flagged_only === '1') {
        return 'flagged';
    }

    if (filters.review_status === 'pending') {
        return 'pending';
    }

    return 'all';
}

function allOutputColumns(): string[] {
    return exportColumnGroups.flatMap((group) =>
        group.columns.map((column) => column.key),
    );
}

function exportUrlFor(columns: string[], attendanceIds: number[]): string {
    const params = new URLSearchParams(
        typeof window === 'undefined' ? '' : window.location.search,
    );
    params.delete('columns[]');
    params.delete('ids[]');
    columns.forEach((column) => params.append('columns[]', column));
    attendanceIds.forEach((id) => params.append('ids[]', String(id)));

    return `/external-training-attendances/export?${params.toString()}`;
}

function attendanceStatusBadgeClass(status: string): string {
    switch (status) {
        case 'present':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'late':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        case 'absent':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'excused':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'not_marked':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function attendanceMarkingSource(
    flagReason: string | null,
    t: (key: string) => string,
): string {
    if (flagReason === AUTO_MARKED_ATTENDANCE_REASON) {
        return t('Auto mark');
    }

    return t('Manual');
}

function reviewActionLabel(status: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        pending: t('Pending review'),
        accepted: t('Accepted'),
        rejected: t('Rejected'),
        corrected: t('Corrected'),
        locked: t('Locked'),
    };

    return labels[status] ?? t(status);
}

function reviewActionBadgeClass(status: string): string {
    switch (status) {
        case 'accepted':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'rejected':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'corrected':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'locked':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        case 'pending':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}
