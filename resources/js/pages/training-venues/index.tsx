import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Eye,
    MapPin,
    Pencil,
    Plus,
    Ruler,
    Search,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/TrainingVenueController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useAuthorization } from '@/hooks/use-authorization';
import { useTranslation } from '@/hooks/use-translation';

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

type PaginatedVenues = {
    data: Venue[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export default function TrainingVenuesIndex({
    trainingVenues,
    filters,
    statuses,
    perPage,
}: {
    trainingVenues: PaginatedVenues;
    filters: {
        q?: string | null;
        status?: string | null;
    };
    statuses: string[];
    perPage: number;
}) {
    const { t } = useTranslation();
    const { can } = useAuthorization();
    const canCreateVenue = can('training-venues.create');
    const canUpdateVenue = can('training-venues.update');
    const [search, setSearch] = useState(filters.q ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const hasFilters = search.trim() !== '' || status !== 'all';

    useEffect(() => {
        // Keep form inputs in sync with URL filters when they change externally.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearch(filters.q ?? '');
        setStatus(filters.status ?? 'all');
    }, [filters.q, filters.status]);

    function statusLabel(value: string): string {
        return t(
            value
                .replaceAll('_', ' ')
                .split(' ')
                .map((word) =>
                    word ? `${word[0]?.toUpperCase()}${word.slice(1)}` : '',
                )
                .join(' '),
        );
    }

    function filterParams(nextPerPage = perPage): Record<string, string> {
        const params: Record<string, string> = {
            per_page: String(nextPerPage),
        };

        if (search.trim() !== '') {
            params['filter[q]'] = search.trim();
        }

        if (status !== 'all') {
            params['filter[status]'] = status;
        }

        return params;
    }

    function applyFilters(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        router.get(index.url(), filterParams(), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStatus('all');

        router.get(
            index.url(),
            { per_page: String(perPage) },
            { replace: true, preserveScroll: true, preserveState: true },
        );
    }

    function changePerPage(value: number) {
        router.get(index.url(), filterParams(value), {
            replace: true,
            preserveScroll: true,
            preserveState: true,
        });
    }

    return (
        <>
            <Head title={t('Training venues')} />
            <div className="flex h-[calc(100svh-3rem)] flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Training venues')}
                        description={t(
                            'Manage external training locations and attendance radius settings.',
                        )}
                    />
                    {canCreateVenue ? (
                        <Button asChild size="sm">
                            <Link href={create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add venue')}
                            </Link>
                        </Button>
                    ) : null}
                </div>

                <form
                    onSubmit={applyFilters}
                    className="shrink-0 rounded-xl border bg-card p-3 shadow-sm"
                >
                    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="venue-search">{t('Search')}</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="venue-search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={t(
                                        'Search venue, code, or city',
                                    )}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="venue-status">{t('Status')}</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger
                                    id="venue-status"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('All statuses')}
                                    </SelectItem>
                                    {statuses.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {statusLabel(option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">
                                <Search className="size-4" />
                                {t('Filter')}
                            </Button>
                            {hasFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                >
                                    <X className="size-4" />
                                    {t('Clear')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </form>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t('Venue directory')}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {trainingVenues.from !== null
                                        ? `${t('Showing')} ${trainingVenues.from}-${trainingVenues.to ?? trainingVenues.from} ${t('of')} ${trainingVenues.total}`
                                        : `${t('Showing')} 0 ${t('of')} ${trainingVenues.total}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:h-full">
                        <Table className="border-separate border-spacing-0 text-sm">
                            <TableHeader className="sticky top-0 z-10">
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableHead className="w-20 border-r border-b px-3 py-2 text-center font-semibold">
                                        {t('S.No.')}
                                    </TableHead>
                                    <TableHead className="min-w-72 border-r border-b px-3 py-2 font-semibold">
                                        {t('Venue')}
                                    </TableHead>
                                    <TableHead className="min-w-64 border-r border-b px-3 py-2 font-semibold">
                                        {t('Location')}
                                    </TableHead>
                                    <TableHead className="w-36 border-r border-b px-3 py-2 text-center font-semibold">
                                        {t('Radius')}
                                    </TableHead>
                                    <TableHead className="w-36 border-r border-b px-3 py-2 text-center font-semibold">
                                        {t('Status')}
                                    </TableHead>
                                    <TableHead className="w-28 border-b px-3 py-2 text-right font-semibold">
                                        {t('Actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trainingVenues.data.map((venue, index) => (
                                    <TableRow
                                        key={venue.id}
                                        className="odd:bg-background even:bg-muted/20 hover:bg-sky-50/70 dark:hover:bg-sky-950/20"
                                    >
                                        <TableCell className="border-r border-b px-3 py-2 text-center font-semibold text-muted-foreground tabular-nums">
                                            {(trainingVenues.from ?? 1) + index}
                                        </TableCell>
                                        <TableCell className="border-r border-b px-3 py-2 align-top">
                                            <div className="min-w-72 space-y-1">
                                                <Link
                                                    href={show.url(venue)}
                                                    className="font-semibold text-primary hover:underline"
                                                >
                                                    {venue.name}
                                                </Link>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5">
                                                        <Building2 className="size-3.5" />
                                                        {venue.code ||
                                                            t('No code')}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="border-r border-b px-3 py-2 align-top">
                                            <div className="min-w-64 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="size-4 text-sky-600" />
                                                    <span className="font-medium">
                                                        {venue.city ||
                                                            venue.district
                                                                ?.name ||
                                                            t('Not set')}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {venue.unit?.name ||
                                                        t('No unit linked')}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="border-r border-b px-3 py-2 text-center align-top">
                                            <span className="inline-flex items-center justify-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium tabular-nums">
                                                <Ruler className="size-3.5 text-muted-foreground" />
                                                {venue.allowed_radius_meters} m
                                            </span>
                                        </TableCell>
                                        <TableCell className="border-r border-b px-3 py-2 text-center align-top">
                                            <Badge
                                                variant={
                                                    venue.status === 'active'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {statusLabel(venue.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="border-b px-3 py-2 text-right align-top">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    asChild
                                                    size="icon"
                                                    variant="ghost"
                                                >
                                                    <Link
                                                        href={show.url(venue)}
                                                        aria-label={t('View')}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                {canUpdateVenue ? (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                    >
                                                        <Link
                                                            href={edit.url(
                                                                venue,
                                                            )}
                                                            aria-label={t(
                                                                'Edit',
                                                            )}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {trainingVenues.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-28 border-b text-center text-sm text-muted-foreground"
                                        >
                                            {t('No training venues found.')}
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ListingPagination
                    paginator={trainingVenues}
                    itemLabel={t('venues')}
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
