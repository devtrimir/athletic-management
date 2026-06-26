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

type Update = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    review_status: string;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string };
    sport: { name: string };
};

type Sport = {
    id: number;
    name: string;
};

type Filters = {
    member_query: string | null;
    coach_query: string | null;
    sport_id: string | null;
    review_status: string | null;
    date_from: string | null;
    date_to: string | null;
};

type PaginatedUpdates = PaginatedListing & {
    data: Update[];
};

type Props = {
    updates: PaginatedUpdates;
    filters: Filters;
    reviewStatuses: string[];
    sports: Sport[];
};

export default function ExternalCoachPerformanceUpdatesIndex({ updates, filters, reviewStatuses, sports }: Props) {
    const { t } = useTranslation();
    const { locale = 'en' } = usePage().props as { locale?: string };
    const [memberQuery, setMemberQuery] = useState<string>(filters.member_query ?? '');
    const [coachQuery, setCoachQuery] = useState<string>(filters.coach_query ?? '');
    const [dateFrom, setDateFrom] = useState<string>(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState<string>(filters.date_to ?? '');
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>(filters.review_status ?? 'all');
    const [sportFilter, setSportFilter] = useState<string>(filters.sport_id ?? 'all');
    const sportItems: ComboboxItem[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
    }));
    const hasFilters =
        memberQuery.trim() !== '' ||
        coachQuery.trim() !== '' ||
        dateFrom !== '' ||
        dateTo !== '' ||
        reviewStatusFilter !== 'all' ||
        sportFilter !== 'all';

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

        if (dateFrom !== '') {
            params['filter[date_from]'] = dateFrom;
        }

        if (dateTo !== '') {
            params['filter[date_to]'] = dateTo;
        }

        if (reviewStatusFilter !== 'all') {
            params['filter[review_status]'] = reviewStatusFilter;
        }

        if (sportFilter !== 'all') {
            params['filter[sport_id]'] = sportFilter;
        }

        router.get('/external-coach-performance-updates', params, {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setMemberQuery('');
        setCoachQuery('');
        setDateFrom('');
        setDateTo('');
        setReviewStatusFilter('all');
        setSportFilter('all');

        router.get('/external-coach-performance-updates', {}, { replace: true, preserveScroll: true, preserveState: true });
    }

    return (
        <>
            <Head title={t('External coach performance updates')} />

            <div className="space-y-4 p-4 sm:p-6">
                <Heading
                    title={t('External coach performance updates')}
                    description={t('Review progress updates submitted by external coaches.')}
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
                            {hasDateError ? (
                                <p className="text-xs text-destructive">
                                    {t('Date from cannot be after date to.')}
                                </p>
                            ) : null}
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
                            <Label htmlFor="sport_filter" className="text-sm font-medium">
                                {t('Sport')}
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
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Score')}</TableHead>
                                <TableHead>{t('Review status')}</TableHead>
                                <TableHead>{t('Action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {updates.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                                        {t('No performance updates found.')}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {updates.data.map((update, index) => (
                                <TableRow key={update.id}>
                                    <TableCell>{(updates.from ?? 1) + index}</TableCell>
                                    <TableCell>{formatDisplayDate(update.update_date, locale)}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{update.member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {update.member.member_code ?? update.member.pno}
                                        </div>
                                    </TableCell>
                                    <TableCell>{update.external_coach.name}</TableCell>
                                    <TableCell>{update.sport.name}</TableCell>
                                    <TableCell>{update.performance_score ?? '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t(update.review_status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/external-coach-performance-updates/${update.id}`}>{t('Review')}</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <ListingPagination paginator={updates} itemLabel={t('performance updates')} />
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
