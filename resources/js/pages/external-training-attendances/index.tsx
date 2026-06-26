import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, Search, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import type { ComboboxItem } from '@/components/combobox';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import type { PaginatedListing } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    geo_status: string;
    review_status: string;
    distance_from_venue_meters: string | null;
    flag_reason: string | null;
    submitted_at: string;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string };
    training_venue: { name: string };
    assignment: { sport: { name: string } | null } | null;
    reviewer: { name: string } | null;
};

type PaginatedAttendances = PaginatedListing & {
    data: Attendance[];
};

type Sport = {
    id: number;
    name: string;
};

type Filters = {
    member_query: string | null;
    coach_query: string | null;
    venue_query: string | null;
    sport_query: string | null;
    sport_id: string | null;
    date_from: string | null;
    date_to: string | null;
    attendance_status: string | null;
    geo_status: string | null;
    review_status: string | null;
};

type Props = {
    attendances: PaginatedAttendances;
    filters: Filters;
    attendanceStatuses: string[];
    geoStatuses: string[];
    reviewStatuses: string[];
    sports: Sport[];
    trainingVenues?: { id: number; name: string }[];
};

export default function ExternalTrainingAttendanceIndex({
    attendances,
    filters,
    attendanceStatuses,
    geoStatuses,
    reviewStatuses,
    sports,
}: Props) {
    const { t } = useTranslation();
    const { locale = 'en' } = usePage().props as { locale?: string };
    const [memberQuery, setMemberQuery] = useState<string>(filters.member_query ?? '');
    const [coachQuery, setCoachQuery] = useState<string>(filters.coach_query ?? '');
    const [venueQuery, setVenueQuery] = useState<string>(filters.venue_query ?? '');
    const [sportQuery, setSportQuery] = useState<string>(filters.sport_query ?? '');
    const [sportFilter, setSportFilter] = useState<string>(filters.sport_id ?? 'all');
    const [dateFrom, setDateFrom] = useState<string>(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState<string>(filters.date_to ?? '');
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>(filters.attendance_status ?? 'all');
    const [geoStatusFilter, setGeoStatusFilter] = useState<string>(filters.geo_status ?? 'all');
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>(filters.review_status ?? 'all');
    const sportItems: ComboboxItem[] = sports.map((sport) => ({ value: String(sport.id), label: sport.name }));
    const hasFilters =
        memberQuery.trim() !== '' ||
        coachQuery.trim() !== '' ||
        venueQuery.trim() !== '' ||
        sportQuery.trim() !== '' ||
        sportFilter !== 'all' ||
        dateFrom !== '' ||
        dateTo !== '' ||
        attendanceStatusFilter !== 'all' ||
        geoStatusFilter !== 'all' ||
        reviewStatusFilter !== 'all';
    const hasDateError = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        if (hasDateError) {
            return;
        }

        const params: Record<string, string> = {};

        if (memberQuery.trim() !== '') {
            params['filter[member_query]'] = memberQuery.trim();
        }

        if (coachQuery.trim() !== '') {
            params['filter[coach_query]'] = coachQuery.trim();
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

        router.get('/external-training-attendances', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setMemberQuery('');
        setCoachQuery('');
        setVenueQuery('');
        setSportQuery('');
        setSportFilter('all');
        setDateFrom('');
        setDateTo('');
        setAttendanceStatusFilter('all');
        setGeoStatusFilter('all');
        setReviewStatusFilter('all');

        router.get('/external-training-attendances', {}, { replace: true, preserveScroll: true, preserveState: true });
    }

    return (
        <>
            <Head title={t('External training attendance')} />

            <div className="space-y-4 p-4 sm:p-6">
                <Heading
                    title={t('External training attendance')}
                    description={t('Review submitted external training proof and geo flags.')}
                />

                <form className="rounded-lg border bg-card p-4" onSubmit={applyFilters}>
                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))] items-end">
                        <div className="space-y-1">
                            <Label htmlFor="member_query" className="text-sm font-medium">
                                {t('Member')}
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="member_query"
                                    name="member_query"
                                    value={memberQuery}
                                    onChange={(event) => setMemberQuery(event.target.value)}
                                    placeholder={t('Search member by name, code, or PNO')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="coach_query" className="text-sm font-medium">
                                {t('External coach')}
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="coach_query"
                                    name="coach_query"
                                    value={coachQuery}
                                    onChange={(event) => setCoachQuery(event.target.value)}
                                    placeholder={t('Search coach by name, phone, or email')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="venue_query" className="text-sm font-medium">
                                {t('Venue')}
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="venue_query"
                                    name="venue_query"
                                    value={venueQuery}
                                    onChange={(event) => setVenueQuery(event.target.value)}
                                    placeholder={t('Search venue by name')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sport_query" className="text-sm font-medium">
                                {t('Sport')}
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="sport_query"
                                    name="sport_query"
                                    value={sportQuery}
                                    onChange={(event) => setSportQuery(event.target.value)}
                                    placeholder={t('Search sport')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sport_filter" className="text-sm font-medium">
                                {t('Sport (from list)')}
                            </Label>
                            <Combobox
                                id="sport_filter"
                                value={sportFilter === 'all' ? '' : sportFilter}
                                onValueChange={(value) => setSportFilter(value || 'all')}
                                items={sportItems}
                                placeholder={t('All sports')}
                                searchPlaceholder={t('Search sport')}
                                emptyMessage={t('No sport found.')}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="attendance_status" className="text-sm font-medium">
                                {t('Attendance status')}
                            </Label>
                            <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
                                <SelectTrigger id="attendance_status">
                                    <SelectValue placeholder={t('All')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All')}</SelectItem>
                                    {attendanceStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="geo_status" className="text-sm font-medium">
                                {t('Geo status')}
                            </Label>
                            <Select value={geoStatusFilter} onValueChange={setGeoStatusFilter}>
                                <SelectTrigger id="geo_status">
                                    <SelectValue placeholder={t('All')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All')}</SelectItem>
                                    {geoStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="review_status" className="text-sm font-medium">
                                {t('Review status')}
                            </Label>
                            <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                                <SelectTrigger id="review_status">
                                    <SelectValue placeholder={t('All')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All')}</SelectItem>
                                    {reviewStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="date_from" className="text-sm font-medium">
                                {t('Date from')}
                            </Label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="date_from"
                                    name="date_from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(event) => setDateFrom(event.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="date_to" className="text-sm font-medium">
                                {t('Date to')}
                            </Label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    id="date_to"
                                    name="date_to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(event) => setDateTo(event.target.value)}
                                    className={hasDateError ? 'pl-9 border-destructive' : 'pl-9'}
                                />
                            </div>
                            {hasDateError ? <p className="text-xs text-destructive">{t('Date from cannot be after date to.')}</p> : null}
                        </div>
                    </div>

                    <div className="mt-1 flex items-center justify-end gap-2">
                        {hasFilters ? (
                            <Button type="button" variant="outline" onClick={clearFilters}>
                                <X className="size-4" />
                                {t('Clear filters')}
                            </Button>
                        ) : null}
                        <Button type="submit" disabled={hasDateError}>
                            {t('Apply filters')}
                        </Button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('S.No.')}</TableHead>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Member')}</TableHead>
                                <TableHead>{t('External coach')}</TableHead>
                                <TableHead>{t('Venue')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Geo status')}</TableHead>
                                <TableHead>{t('Review status')}</TableHead>
                                <TableHead>{t('Distance')}</TableHead>
                                <TableHead>{t('Action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center text-sm text-muted-foreground">
                                        {t('No attendance records found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {attendances.data.map((attendance, index) => (
                                <TableRow key={attendance.id}>
                                    <TableCell>{(attendances.from ?? 1) + index}</TableCell>
                                    <TableCell>{formatDisplayDate(attendance.attendance_date, locale)}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{attendance.member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {attendance.member.member_code ?? attendance.member.pno}
                                        </div>
                                    </TableCell>
                                    <TableCell>{attendance.external_coach.name}</TableCell>
                                    <TableCell>{attendance.training_venue.name}</TableCell>
                                    <TableCell>{attendance.assignment?.sport?.name ?? '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={attendance.geo_status === 'valid' ? 'secondary' : 'destructive'}>
                                            {t(attendance.geo_status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t(attendance.review_status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {attendance.distance_from_venue_meters ?? '-'} m
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/external-training-attendances/${attendance.id}`}>
                                                {t('Review')}
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination paginator={attendances} itemLabel={t('attendances')} />
            </div>
        </>
    );
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
