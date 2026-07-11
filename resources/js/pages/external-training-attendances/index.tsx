import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Download,
    Eye,
    Printer,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import type { ComboboxItem } from '@/components/combobox';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import type { PaginatedListing } from '@/components/listing-pagination';
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
            { key: 'member_code', label: 'Member Code' },
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
    const { locale = 'en' } = usePage().props as { locale?: string };
    const [query, setQuery] = useState<string>(filters.q ?? '');
    const [memberQuery, setMemberQuery] = useState<string>(
        filters.member_query ?? '',
    );
    const [coachQuery, setCoachQuery] = useState<string>(
        filters.coach_query ?? '',
    );
    const [venueQuery, setVenueQuery] = useState<string>(
        filters.venue_query ?? '',
    );
    const [sportQuery, setSportQuery] = useState<string>(
        filters.sport_query ?? '',
    );
    const [sportFilter, setSportFilter] = useState<string>(
        filters.sport_id ?? 'all',
    );
    const [coachFilter, setCoachFilter] = useState<string>(
        filters.external_coach_id ?? 'all',
    );
    const [venueFilter, setVenueFilter] = useState<string>(
        filters.training_venue_id ?? 'all',
    );
    const [dateFrom, setDateFrom] = useState<string>(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState<string>(filters.date_to ?? '');
    const [attendanceStatusFilter, setAttendanceStatusFilter] =
        useState<string>(filters.attendance_status ?? 'all');
    const [geoStatusFilter, setGeoStatusFilter] = useState<string>(
        filters.geo_status ?? 'all',
    );
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>(
        filters.review_status ?? 'all',
    );
    const [reviewQueue, setReviewQueue] = useState<string>(
        reviewQueueFromFilters(filters),
    );
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [outputOpen, setOutputOpen] = useState(false);
    const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<
        number[]
    >([]);
    const [selectedOutputColumns, setSelectedOutputColumns] =
        useState<string[]>(defaultExportColumns);
    const sportItems: ComboboxItem[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
    }));
    const coachItems: ComboboxItem[] = externalCoaches.map((coach) => ({
        value: String(coach.id),
        label: coach.name,
    }));
    const venueItems: ComboboxItem[] = trainingVenues.map((venue) => ({
        value: String(venue.id),
        label: venue.name,
    }));
    const advancedFilterCount = [
        memberQuery.trim() !== '',
        coachQuery.trim() !== '',
        venueQuery.trim() !== '',
        sportQuery.trim() !== '',
        sportFilter !== 'all',
        coachFilter !== 'all',
        venueFilter !== 'all',
        geoStatusFilter !== 'all',
        reviewStatusFilter !== 'all' && reviewQueue !== 'pending',
    ].filter(Boolean).length;
    const hasFilters =
        query.trim() !== '' ||
        memberQuery.trim() !== '' ||
        coachQuery.trim() !== '' ||
        venueQuery.trim() !== '' ||
        sportQuery.trim() !== '' ||
        sportFilter !== 'all' ||
        coachFilter !== 'all' ||
        venueFilter !== 'all' ||
        reviewQueue !== 'all' ||
        dateFrom !== '' ||
        dateTo !== '' ||
        attendanceStatusFilter !== 'all' ||
        geoStatusFilter !== 'all' ||
        reviewStatusFilter !== 'all';
    const hasDateError = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;
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
    const paginationSummary =
        attendances.from !== null
            ? `${t('Showing')} ${attendances.from}-${attendances.to ?? attendances.from} ${t('of')} ${attendances.total} ${t('attendances')}`
            : `${t('Showing')} 0 ${t('of')} ${attendances.total} ${t('attendances')}`;

    useEffect(() => {
        setQuery(filters.q ?? '');
        setMemberQuery(filters.member_query ?? '');
        setCoachQuery(filters.coach_query ?? '');
        setVenueQuery(filters.venue_query ?? '');
        setSportQuery(filters.sport_query ?? '');
        setSportFilter(filters.sport_id ?? 'all');
        setCoachFilter(filters.external_coach_id ?? 'all');
        setVenueFilter(filters.training_venue_id ?? 'all');
        setDateFrom(filters.date_from ?? '');
        setDateTo(filters.date_to ?? '');
        setAttendanceStatusFilter(filters.attendance_status ?? 'all');
        setGeoStatusFilter(filters.geo_status ?? 'all');
        setReviewStatusFilter(filters.review_status ?? 'all');
        setReviewQueue(reviewQueueFromFilters(filters));
    }, [filters]);

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        if (hasDateError) {
            return;
        }

        const params: Record<string, string> = {};

        if (query.trim() !== '') {
            params['filter[q]'] = query.trim();
        }

        if (memberQuery.trim() !== '') {
            params['filter[member_query]'] = memberQuery.trim();
        }

        if (coachQuery.trim() !== '') {
            params['filter[coach_query]'] = coachQuery.trim();
        }

        if (coachFilter !== 'all') {
            params['filter[external_coach_id]'] = coachFilter;
        }

        if (venueFilter !== 'all') {
            params['filter[training_venue_id]'] = venueFilter;
        }

        if (venueQuery.trim() !== '') {
            params['filter[venue_query]'] = venueQuery.trim();
        }

        if (sportQuery.trim() !== '') {
            params['filter[sport_query]'] = sportQuery.trim();
        }

        if (sportFilter !== 'all') {
            params['filter[sport_id]'] = sportFilter;
        }

        if (dateFrom !== '') {
            params['filter[date_from]'] = dateFrom;
        }

        if (dateTo !== '') {
            params['filter[date_to]'] = dateTo;
        }

        if (attendanceStatusFilter !== 'all') {
            params['filter[attendance_status]'] = attendanceStatusFilter;
        }

        if (geoStatusFilter !== 'all') {
            params['filter[geo_status]'] = geoStatusFilter;
        }

        if (reviewStatusFilter !== 'all') {
            params['filter[review_status]'] = reviewStatusFilter;
        }

        applyReviewQueueParams(params);

        router.get('/external-training-attendances', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function changeRowsPerPage(value: number) {
        const params = buildFilterParams();
        params.per_page = String(value);

        router.get('/external-training-attendances', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function buildFilterParams(
        overrides: {
            dateFromOverride?: string;
            dateToOverride?: string;
        } = {},
    ): Record<string, string> {
        const params: Record<string, string> = {};
        const nextDateFrom = overrides.dateFromOverride ?? dateFrom;
        const nextDateTo = overrides.dateToOverride ?? dateTo;

        if (query.trim() !== '') {
            params['filter[q]'] = query.trim();
        }

        if (memberQuery.trim() !== '') {
            params['filter[member_query]'] = memberQuery.trim();
        }

        if (coachQuery.trim() !== '') {
            params['filter[coach_query]'] = coachQuery.trim();
        }

        if (coachFilter !== 'all') {
            params['filter[external_coach_id]'] = coachFilter;
        }

        if (venueFilter !== 'all') {
            params['filter[training_venue_id]'] = venueFilter;
        }

        if (venueQuery.trim() !== '') {
            params['filter[venue_query]'] = venueQuery.trim();
        }

        if (sportQuery.trim() !== '') {
            params['filter[sport_query]'] = sportQuery.trim();
        }

        if (sportFilter !== 'all') {
            params['filter[sport_id]'] = sportFilter;
        }

        if (nextDateFrom !== '') {
            params['filter[date_from]'] = nextDateFrom;
        }

        if (nextDateTo !== '') {
            params['filter[date_to]'] = nextDateTo;
        }

        if (attendanceStatusFilter !== 'all') {
            params['filter[attendance_status]'] = attendanceStatusFilter;
        }

        if (geoStatusFilter !== 'all') {
            params['filter[geo_status]'] = geoStatusFilter;
        }

        if (reviewStatusFilter !== 'all') {
            params['filter[review_status]'] = reviewStatusFilter;
        }

        applyReviewQueueParams(params);

        return params;
    }

    function applyReviewQueueParams(params: Record<string, string>) {
        if (reviewQueue === 'pending') {
            params['filter[review_status]'] = 'pending';
        }

        if (reviewQueue === 'flagged') {
            params['filter[flagged_only]'] = '1';
        }

        if (reviewQueue === 'outside_radius') {
            params['filter[outside_radius_only]'] = '1';
        }

        if (reviewQueue === 'missing_location') {
            params['filter[missing_location_only]'] = '1';
        }

        if (reviewQueue === 'low_accuracy') {
            params['filter[low_accuracy_only]'] = '1';
        }
    }

    function setDatePreset(preset: 'today' | 'week' | 'month') {
        const today = new Date();
        const start = new Date(today);

        if (preset === 'week') {
            const day = start.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            start.setDate(start.getDate() + mondayOffset);
        }

        if (preset === 'month') {
            start.setDate(1);
        }

        const presetDateFrom = formatDateInput(start);
        const presetDateTo = formatDateInput(today);

        setDateFrom(presetDateFrom);
        setDateTo(presetDateTo);
        visitWithFilters({
            dateFromOverride: presetDateFrom,
            dateToOverride: presetDateTo,
        });
    }

    function clearFilters() {
        setQuery('');
        setMemberQuery('');
        setCoachQuery('');
        setVenueQuery('');
        setSportQuery('');
        setSportFilter('all');
        setCoachFilter('all');
        setVenueFilter('all');
        setDateFrom('');
        setDateTo('');
        setAttendanceStatusFilter('all');
        setGeoStatusFilter('all');
        setReviewStatusFilter('all');
        setReviewQueue('all');

        router.get(
            '/external-training-attendances',
            {},
            { replace: true, preserveScroll: true, preserveState: true },
        );
    }

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

    function visitWithFilters(
        overrides: {
            dateFromOverride?: string;
            dateToOverride?: string;
        } = {},
    ) {
        const params = buildFilterParams(overrides);

        router.get('/external-training-attendances', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
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

            <div className="space-y-4 p-4 sm:p-6">
                <Heading
                    title={t('External training attendance')}
                    description={t(
                        'Review submitted external training proof and geo flags.',
                    )}
                />

                <form
                    className="overflow-hidden rounded-lg border bg-card shadow-sm"
                    onSubmit={applyFilters}
                >
                    <div className="border-b bg-muted/20 px-3 py-2">
                        <div className="text-sm font-semibold">
                            {t('Find attendance quickly')}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            {t(
                                'Search member, PNO, coach, venue, sport, or remarks.',
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3 p-3">
                        <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_190px_190px_145px_145px_170px_auto] xl:items-end">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="attendance_query"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('Search')}
                                </Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        id="attendance_query"
                                        name="attendance_query"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        placeholder={t(
                                            'Member, PNO, coach, venue, sport...',
                                        )}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label
                                    htmlFor="coach_filter"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('Coach')}
                                </Label>
                                <Combobox
                                    id="coach_filter"
                                    value={
                                        coachFilter === 'all' ? '' : coachFilter
                                    }
                                    onValueChange={(value) =>
                                        setCoachFilter(value || 'all')
                                    }
                                    items={coachItems}
                                    placeholder={t('All coaches')}
                                    searchPlaceholder={t('Search coach')}
                                    emptyMessage={t('No coach found.')}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label
                                    htmlFor="venue_filter"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('Venue')}
                                </Label>
                                <Combobox
                                    id="venue_filter"
                                    value={
                                        venueFilter === 'all' ? '' : venueFilter
                                    }
                                    onValueChange={(value) =>
                                        setVenueFilter(value || 'all')
                                    }
                                    items={venueItems}
                                    placeholder={t('All venues')}
                                    searchPlaceholder={t('Search venue')}
                                    emptyMessage={t('No venue found.')}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label
                                    htmlFor="date_from"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('From date')}
                                </Label>
                                <DatePicker
                                    id="date_from"
                                    value={dateFrom}
                                    onChange={setDateFrom}
                                    placeholder={t('Start date')}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label
                                    htmlFor="date_to"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('To date')}
                                </Label>
                                <DatePicker
                                    id="date_to"
                                    value={dateTo}
                                    onChange={setDateTo}
                                    placeholder={t('End date')}
                                    aria-invalid={hasDateError}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label
                                    htmlFor="review_queue"
                                    className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground"
                                >
                                    {t('Review queue')}
                                </Label>
                                <Select
                                    value={reviewQueue}
                                    onValueChange={setReviewQueue}
                                >
                                    <SelectTrigger id="review_queue">
                                        <SelectValue placeholder={t('All')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {t('All')}
                                        </SelectItem>
                                        <SelectItem value="pending">
                                            {t('Pending review')}
                                        </SelectItem>
                                        <SelectItem value="flagged">
                                            {t('Geo flagged')}
                                        </SelectItem>
                                        <SelectItem value="outside_radius">
                                            {t('Outside radius')}
                                        </SelectItem>
                                        <SelectItem value="missing_location">
                                            {t('Missing location')}
                                        </SelectItem>
                                        <SelectItem value="low_accuracy">
                                            {t('Low accuracy')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <Button
                                    type="submit"
                                    disabled={hasDateError}
                                    className="h-9 w-full sm:w-auto"
                                >
                                    {t('Apply')}
                                </Button>
                                <Dialog
                                    open={filtersOpen}
                                    onOpenChange={setFiltersOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 w-full sm:w-auto"
                                        >
                                            <SlidersHorizontal className="size-4" />
                                            {t('More filters')}
                                            {advancedFilterCount > 0 ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-1 px-1.5 py-0 text-[10px]"
                                                >
                                                    {advancedFilterCount}
                                                </Badge>
                                            ) : null}
                                        </Button>
                                    </DialogTrigger>
                                </Dialog>
                            </div>
                        </div>

                        {hasDateError ? (
                            <p className="text-xs text-destructive">
                                {t('Date from cannot be after date to.')}
                            </p>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {t('Quick dates')}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setDatePreset('today')}
                                >
                                    {t('Today')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setDatePreset('week')}
                                >
                                    {t('This week')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setDatePreset('month')}
                                >
                                    {t('This month')}
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {paginationSummary}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div />
                            <div className="flex flex-wrap gap-2">
                                {hasFilters ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-8"
                                    >
                                        <X className="size-4" />
                                        {t('Clear filters')}
                                    </Button>
                                ) : null}
                                <Dialog
                                    open={filtersOpen}
                                    onOpenChange={setFiltersOpen}
                                >
                                    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {t('Advanced filters')}
                                            </DialogTitle>
                                        </DialogHeader>

                                        <div className="grid gap-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="member_query"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Member only')}
                                                </Label>
                                                <Input
                                                    id="member_query"
                                                    value={memberQuery}
                                                    onChange={(event) =>
                                                        setMemberQuery(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Name, code, or PNO',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="coach_query"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Coach only')}
                                                </Label>
                                                <Input
                                                    id="coach_query"
                                                    value={coachQuery}
                                                    onChange={(event) =>
                                                        setCoachQuery(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Name, phone, or email',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="venue_query"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Venue only')}
                                                </Label>
                                                <Input
                                                    id="venue_query"
                                                    value={venueQuery}
                                                    onChange={(event) =>
                                                        setVenueQuery(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Venue name',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="sport_query"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Sport text')}
                                                </Label>
                                                <Input
                                                    id="sport_query"
                                                    value={sportQuery}
                                                    onChange={(event) =>
                                                        setSportQuery(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Sport name',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="attendance_status"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Attendance status')}
                                                </Label>
                                                <Select
                                                    value={
                                                        attendanceStatusFilter
                                                    }
                                                    onValueChange={
                                                        setAttendanceStatusFilter
                                                    }
                                                >
                                                    <SelectTrigger id="attendance_status">
                                                        <SelectValue
                                                            placeholder={t(
                                                                'All',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            {t('All')}
                                                        </SelectItem>
                                                        {attendanceStatuses.map(
                                                            (status) => (
                                                                <SelectItem
                                                                    key={status}
                                                                    value={
                                                                        status
                                                                    }
                                                                >
                                                                    {t(status)}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="sport_filter"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Sport (from list)')}
                                                </Label>
                                                <Combobox
                                                    id="sport_filter"
                                                    value={
                                                        sportFilter === 'all'
                                                            ? ''
                                                            : sportFilter
                                                    }
                                                    onValueChange={(value) =>
                                                        setSportFilter(
                                                            value || 'all',
                                                        )
                                                    }
                                                    items={sportItems}
                                                    placeholder={t(
                                                        'All sports',
                                                    )}
                                                    searchPlaceholder={t(
                                                        'Search sport',
                                                    )}
                                                    emptyMessage={t(
                                                        'No sport found.',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="geo_status"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Geo status')}
                                                </Label>
                                                <Select
                                                    value={geoStatusFilter}
                                                    onValueChange={
                                                        setGeoStatusFilter
                                                    }
                                                >
                                                    <SelectTrigger id="geo_status">
                                                        <SelectValue
                                                            placeholder={t(
                                                                'All',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            {t('All')}
                                                        </SelectItem>
                                                        {geoStatuses.map(
                                                            (status) => (
                                                                <SelectItem
                                                                    key={status}
                                                                    value={
                                                                        status
                                                                    }
                                                                >
                                                                    {t(status)}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="review_status"
                                                    className="text-sm font-medium"
                                                >
                                                    {t('Review status')}
                                                </Label>
                                                <Select
                                                    value={reviewStatusFilter}
                                                    onValueChange={
                                                        setReviewStatusFilter
                                                    }
                                                >
                                                    <SelectTrigger id="review_status">
                                                        <SelectValue
                                                            placeholder={t(
                                                                'All',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            {t('All')}
                                                        </SelectItem>
                                                        {reviewStatuses.map(
                                                            (status) => (
                                                                <SelectItem
                                                                    key={status}
                                                                    value={
                                                                        status
                                                                    }
                                                                >
                                                                    {t(status)}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={clearFilters}
                                            >
                                                <X className="size-4" />
                                                {t('Clear filters')}
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={hasDateError}
                                                onClick={() => {
                                                    applyFilters();
                                                    setFiltersOpen(false);
                                                }}
                                            >
                                                {t('Apply filters')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                </form>

                <div
                    id="external-training-attendance-print"
                    className="overflow-hidden rounded-lg border bg-card shadow-sm print:border-0 print:shadow-none"
                >
                    <div className="flex flex-col gap-2 border-b bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
                        <div>
                            <div className="text-sm font-semibold">
                                {t('Attendance records')}
                            </div>
                            <div className="text-[11px] font-medium text-muted-foreground">
                                {paginationSummary}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedAttendanceIds.length > 0 ? (
                                <Badge
                                    variant="secondary"
                                    className="rounded-full"
                                >
                                    {selectedAttendanceIds.length}{' '}
                                    {t('selected')}
                                </Badge>
                            ) : null}
                            <Dialog
                                open={outputOpen}
                                onOpenChange={setOutputOpen}
                            >
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
                                            const groupColumns =
                                                group.columns.map(
                                                    (column) => column.key,
                                                );
                                            const allChecked =
                                                groupColumns.every((column) =>
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
                                                                    key={
                                                                        column.key
                                                                    }
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
                                                printSelectedAttendanceColumns(
                                                    t(
                                                        'External training attendance',
                                                    ),
                                                    selectedOutputColumns,
                                                    selectedAttendanceIds,
                                                )
                                            }
                                        >
                                            <Printer className="size-4" />
                                            {t('Print selected')}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <Table className="min-w-[980px] text-[11px]">
                        <TableHeader>
                            <TableRow className="border-b bg-muted/60 hover:bg-muted/60">
                                <TableHead className="sticky left-0 z-20 h-8 w-10 border-r bg-muted px-2 text-[10px] print:hidden">
                                    <Checkbox
                                        checked={allPageRowsSelected}
                                        onCheckedChange={(checked) =>
                                            togglePageSelection(
                                                checked === true,
                                            )
                                        }
                                        aria-label={t(
                                            'Select all visible attendances',
                                        )}
                                    />
                                </TableHead>
                                <TableHead className="sticky left-10 z-20 h-8 w-12 border-r bg-muted px-2 text-[10px]">
                                    {t('S.No.')}
                                </TableHead>
                                <TableHead className="sticky left-22 z-20 h-8 w-20 border-r bg-muted px-2 text-[10px] shadow-[8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                                    {t('Review')}
                                </TableHead>
                                <TableHead className="h-8 w-24 px-2 text-[10px]">
                                    {t('Date')}
                                </TableHead>
                                <TableHead className="h-8 min-w-40 px-2 text-[10px]">
                                    {t('Member')}
                                </TableHead>
                                <TableHead className="h-8 min-w-36 px-2 text-[10px]">
                                    {t('External coach')}
                                </TableHead>
                                <TableHead className="h-8 min-w-28 px-2 text-[10px]">
                                    {t('Venue')}
                                </TableHead>
                                <TableHead className="h-8 min-w-24 px-2 text-[10px]">
                                    {t('Sport')}
                                </TableHead>
                                <TableHead className="h-8 w-24 px-2 text-[10px]">
                                    {t('Attendance')}
                                </TableHead>
                                <TableHead className="h-8 w-28 px-2 text-[10px]">
                                    {t('Corrected status')}
                                </TableHead>
                                <TableHead className="h-8 w-24 px-2 text-[10px]">
                                    {t('Geo status')}
                                </TableHead>
                                <TableHead className="h-8 w-28 px-2 text-[10px]">
                                    {t('Review action')}
                                </TableHead>
                                <TableHead className="h-8 w-20 px-2 text-right text-[10px]">
                                    {t('Distance')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={13}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        {t('No attendance records found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {attendances.data.map((attendance, index) => (
                                <TableRow
                                    key={attendance.id}
                                    data-attendance-id={attendance.id}
                                    className="group bg-card hover:bg-muted/30"
                                >
                                    <TableCell className="sticky left-0 z-10 border-r bg-card px-2 py-1.5 group-hover:bg-muted/30 print:hidden">
                                        <Checkbox
                                            checked={selectedAttendanceIds.includes(
                                                attendance.id,
                                            )}
                                            onCheckedChange={(checked) =>
                                                toggleAttendanceSelection(
                                                    attendance.id,
                                                    checked === true,
                                                )
                                            }
                                            aria-label={t('Select attendance')}
                                        />
                                    </TableCell>
                                    <TableCell className="sticky left-10 z-10 border-r bg-card px-2 py-1.5 text-muted-foreground group-hover:bg-muted/30">
                                        {(attendances.from ?? 1) + index}
                                    </TableCell>
                                    <TableCell className="sticky left-22 z-10 border-r bg-card px-2 py-1.5 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.45)] group-hover:bg-muted/30">
                                        {canReviewAttendanceDetails ? (
                                            <Button
                                                asChild
                                                size="sm"
                                                className="h-6 px-1.5 text-[11px]"
                                            >
                                                <Link
                                                    href={`/external-training-attendances/${attendance.id}`}
                                                >
                                                    <Eye className="size-3.5" />
                                                    {t('Review')}
                                                </Link>
                                            </Button>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground">
                                                {t('No access')}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 font-medium whitespace-nowrap">
                                        {formatDisplayDate(
                                            attendance.attendance_date,
                                            locale,
                                        )}
                                    </TableCell>
                                    <TableCell className="min-w-40 px-2 py-1.5">
                                        <Link
                                            href={`/members/${attendance.member.id}`}
                                            className="font-semibold text-foreground hover:text-primary hover:underline"
                                        >
                                            {attendance.member.full_name}
                                        </Link>
                                        {attendance.member.pno ? (
                                            <div className="text-[10px] text-muted-foreground">
                                                {attendance.member.pno}
                                            </div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="min-w-36 px-2 py-1.5">
                                        <Link
                                            href={`/external-coaches/${attendance.external_coach.id}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {attendance.external_coach.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-32 truncate px-2 py-1.5">
                                        {attendance.training_venue.name}
                                    </TableCell>
                                    <TableCell className="max-w-28 truncate px-2 py-1.5">
                                        {attendance.assignment?.sport?.name ??
                                            '-'}
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 whitespace-nowrap">
                                        <div className="flex flex-col items-start gap-1">
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${attendanceStatusBadgeClass(attendance.attendance_status)}`}
                                            >
                                                {t(
                                                    attendance.attendance_status,
                                                )}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 whitespace-nowrap">
                                        {attendance.review_status ===
                                            'corrected' &&
                                        attendance.corrected_attendance_status ? (
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${attendanceStatusBadgeClass(attendance.corrected_attendance_status)}`}
                                            >
                                                {t(
                                                    attendance.corrected_attendance_status,
                                                )}
                                            </Badge>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground">
                                                -
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 whitespace-nowrap">
                                        <Badge
                                            variant={
                                                attendance.geo_status ===
                                                'valid'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                            className="rounded-full px-1.5 py-0 text-[10px] font-semibold"
                                        >
                                            {t(attendance.geo_status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 whitespace-nowrap">
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${reviewActionBadgeClass(attendance.review_status)}`}
                                        >
                                            {reviewActionLabel(
                                                attendance.review_status,
                                                t,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                        {attendance.distance_from_venue_meters ??
                                            '-'}{' '}
                                        m
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination
                    paginator={attendances}
                    itemLabel={t('attendances')}
                    rowsPerPage={{
                        value: attendances.per_page ?? 25,
                        options: [10, 25, 50, 100],
                        onChange: changeRowsPerPage,
                    }}
                />
            </div>
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

function formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (dateOnly) {
        const [year, month, day] = dateOnly[1].split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string, locale: string): string {
    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
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

function printSelectedAttendanceColumns(
    title: string,
    columns: string[],
    attendanceIds: number[],
): void {
    const rows = Array.from(
        document.querySelectorAll<HTMLTableRowElement>(
            '#external-training-attendance-print tbody tr',
        ),
    ).filter((row) => {
        if (attendanceIds.length === 0) {
            return true;
        }

        const rowId = Number(row.dataset.attendanceId);

        return attendanceIds.includes(rowId);
    });
    const headerLabels = columns
        .map((column) =>
            exportColumnGroups
                .flatMap((group) => group.columns)
                .find((item) => item.key === column),
        )
        .filter((column): column is ExportColumn => column !== undefined);
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    if (!printWindow) {
        return;
    }

    const printableRows = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const values: Record<string, string> = {
            date: cells[3]?.textContent?.trim() ?? '',
            member: cells[4]?.textContent?.trim() ?? '',
            pno: cells[4]?.querySelector('div')?.textContent?.trim() ?? '',
            external_coach: cells[5]?.textContent?.trim() ?? '',
            venue: cells[6]?.textContent?.trim() ?? '',
            sport: cells[7]?.textContent?.trim() ?? '',
            attendance_status: cells[8]?.textContent?.trim() ?? '',
            corrected_attendance_status: cells[9]?.textContent?.trim() ?? '',
            review_status: cells[11]?.textContent?.trim() ?? '',
            geo_status: cells[10]?.textContent?.trim() ?? '',
            distance_meters: cells[12]?.textContent?.trim() ?? '',
        };

        return headerLabels
            .map((column) => `<td>${escapeHtml(values[column.key] ?? '')}</td>`)
            .join('');
    });

    printWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
                    h1 { font-size: 16px; margin: 0 0 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { border: 1px solid #d4d4d4; padding: 4px 6px; text-align: left; vertical-align: top; }
                    th { background: #f4f4f5; font-weight: 700; text-transform: uppercase; }
                    a { color: #111; text-decoration: none; }
                    button { display: none; }
                    .sticky { position: static !important; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <table>
                    <thead>
                        <tr>${headerLabels.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${printableRows.map((row) => `<tr>${row}</tr>`).join('')}
                    </tbody>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function escapeHtml(value: string): string {
    return value.replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            })[character] ?? character,
    );
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
