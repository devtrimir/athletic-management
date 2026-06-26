import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, Eye, Pencil, Plus, Search, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { create, edit, index, show } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import type { ComboboxItem } from '@/components/combobox';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

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

type Sport = {
    id: number;
    name: string;
};

type PaginatedAssignments = {
    data: Assignment[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
    assignments: PaginatedAssignments;
    filters: Filters;
    statuses: string[];
    sports: Sport[];
};

export default function ExternalCoachingAssignmentsIndex({ assignments, filters, statuses, sports }: Props) {
    const { t } = useTranslation();
    const { locale } = usePage().props as { locale: string };

    const [memberQuery, setMemberQuery] = useState<string>(filters.member_query ?? '');
    const [coachQuery, setCoachQuery] = useState<string>(filters.coach_query ?? '');
    const [statusFilter, setStatusFilter] = useState<string>(filters.status ?? 'all');
    const [sportFilter, setSportFilter] = useState<string>(filters.sport_id ?? 'all');
    const [fromDate, setFromDate] = useState<string>(filters.start_date_from ?? '');
    const [toDate, setToDate] = useState<string>(filters.start_date_to ?? '');
    const sportItems: ComboboxItem[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
    }));

    const hasFilters =
        memberQuery.trim() !== '' ||
        coachQuery.trim() !== '' ||
        statusFilter !== 'all' ||
        sportFilter !== 'all' ||
        fromDate !== '' ||
        toDate !== '';

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        const params: Record<string, string> = {};

        if (memberQuery.trim() !== '') {
            params['filter[member_query]'] = memberQuery.trim();
        }

        if (coachQuery.trim() !== '') {
            params['filter[coach_query]'] = coachQuery.trim();
        }

        if (statusFilter !== 'all') {
            params['filter[status]'] = statusFilter;
        }

        if (sportFilter !== 'all') {
            params['filter[sport_id]'] = sportFilter;
        }

        if (fromDate !== '') {
            params['filter[start_date_from]'] = fromDate;
        }

        if (toDate !== '') {
            params['filter[start_date_to]'] = toDate;
        }

        router.get(index.url(), params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setMemberQuery('');
        setCoachQuery('');
        setStatusFilter('all');
        setSportFilter('all');
        setFromDate('');
        setToDate('');

        router.get(index.url(), {}, { replace: true, preserveScroll: true, preserveState: true });
    }

    return (
        <>
            <Head title={t('External coaching assignments')} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading title={t('External coaching assignments')} description={t('Manage member assignments to external coaches and venues.')} />
                    <Button asChild>
                        <Link href={create.url()}>
                            <Plus className="size-4" />
                            {t('Add assignment')}
                        </Link>
                    </Button>
                </div>

                <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={applyFilters}>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-full min-w-44 max-w-56 space-y-1.5 sm:w-56">
                            <Label htmlFor="member_query" className="text-sm font-medium">
                                {t('Member')} ({t('name / PNO')})
                            </Label>
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 size-4" />
                                <Input
                                    id="member_query"
                                    name="member_query"
                                    value={memberQuery}
                                    onChange={(event) => setMemberQuery(event.target.value)}
                                    placeholder={t('Search member by name or PNO')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="w-full min-w-44 max-w-56 space-y-1.5 sm:w-56">
                            <Label htmlFor="coach_query" className="text-sm font-medium">
                                {t('Coach')} ({t('name / phone')})
                            </Label>
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 size-4" />
                                <Input
                                    id="coach_query"
                                    name="coach_query"
                                    value={coachQuery}
                                    onChange={(event) => setCoachQuery(event.target.value)}
                                    placeholder={t('Search coach by name or phone')}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="w-full min-w-40 max-w-48 flex-shrink-0 space-y-1.5 sm:w-48">
                            <Label htmlFor="start_date_from" className="text-sm font-medium">
                                {t('Start date from')}
                            </Label>
                            <div className="relative">
                                <Calendar className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 size-4" />
                                <Input
                                    id="start_date_from"
                                    name="start_date_from"
                                    type="date"
                                    value={fromDate}
                                    onChange={(event) => setFromDate(event.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="w-full min-w-40 max-w-48 flex-shrink-0 space-y-1.5 sm:w-48">
                            <Label htmlFor="start_date_to" className="text-sm font-medium">
                                {t('Start date to')}
                            </Label>
                            <div className="relative">
                                <Calendar className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 size-4" />
                                <Input
                                    id="start_date_to"
                                    name="start_date_to"
                                    type="date"
                                    value={toDate}
                                    onChange={(event) => setToDate(event.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="w-full min-w-40 max-w-48 sm:w-48">
                            <Label htmlFor="status_filter" className="text-sm font-medium">
                                {t('Status')}
                            </Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="status_filter" className="h-9 w-full">
                                    <SelectValue placeholder={t('All status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All status')}</SelectItem>
                                    {statuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full min-w-40 max-w-48 sm:w-48">
                            <Label htmlFor="sport_filter" className="text-sm font-medium">
                                {t('Sport')}
                            </Label>
                            <Combobox
                                id="sport_filter"
                                value={sportFilter === 'all' ? '' : sportFilter}
                                onValueChange={(value) => setSportFilter(value || 'all')}
                                items={sportItems}
                                placeholder={t('All sports')}
                                searchPlaceholder={t('Search by sport')}
                                emptyMessage={t('No sport found.')}
                            />
                        </div>

                        <div className="w-auto self-end">
                            <div className="flex items-center gap-2">
                                {hasFilters ? (
                                    <Button variant="outline" type="button" onClick={clearFilters} className="h-9">
                                        <X className="size-4" />
                                        {t('Clear filters')}
                                    </Button>
                                ) : null}

                                <Button type="submit" className="h-9">
                                    {t('Apply filters')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('S.No.')}</TableHead>
                                <TableHead>{t('Member')}</TableHead>
                                <TableHead>{t('Coach / venue')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Period')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-28 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.data.map((assignment, index) => (
                                <TableRow key={assignment.id}>
                                    <TableCell>{(assignments.from ?? 1) + index}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{assignment.member?.full_name ?? t('Unknown member')}</div>
                                        <div className="text-xs text-muted-foreground">{assignment.member?.pno ?? t('No PNO')}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div>{assignment.external_coach?.name ?? t('No coach')}</div>
                                        <div className="text-xs text-muted-foreground">{assignment.training_venue?.name ?? t('No venue')}</div>
                                    </TableCell>
                                    <TableCell>{assignment.sport?.name ?? t('No sport')}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">{formatDisplayDate(assignment.start_date, locale) ?? assignment.start_date}</div>
                                        <div className="text-xs text-muted-foreground">{formatDisplayDate(assignment.end_date, locale) ?? assignment.end_date}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>{t(assignment.status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="icon" variant="ghost">
                                                <Link href={show.url(assignment)} aria-label={t('View')}>
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button asChild size="icon" variant="ghost">
                                                <Link href={edit.url(assignment)} aria-label={t('Edit')}>
                                                    <Pencil className="size-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {assignments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                                        {t('No external coaching assignments found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination paginator={assignments} itemLabel={t('assignments')} />
            </div>
        </>
    );
}

function parseDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string | null | undefined, locale: string): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}
