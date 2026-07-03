import { Head, Link, router, setLayoutProps, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Download,
    Eye,
    Info,
    MapPin,
    Medal,
    FileDown,
    Plus,
    Search,
    Printer,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    create as createTournament,
    index as tournamentsIndex,
    show as showTournament,
} from '@/actions/App/Http/Controllers/TournamentController';
import {
    eventsExport,
    eventsReport,
    index as exportTournamentsUrl,
} from '@/actions/App/Http/Controllers/TournamentExportController';
import { Combobox } from '@/components/combobox';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

const ALL_COLUMNS = [
    { key: 'name', label: 'Tournament Name' },
    { key: 'session', label: 'Session' },
    { key: 'tier', label: 'Tier' },
    { key: 'sport', label: 'Sport' },
    { key: 'venue', label: 'Venue' },
    { key: 'date_from', label: 'Date from' },
    { key: 'date_to', label: 'Date to' },
    { key: 'events_count', label: 'Events' },
    { key: 'participants_count', label: 'Participants' },
    { key: 'teams_count', label: 'Teams' },
    { key: 'medals_count', label: 'Medals' },
    { key: 'created_at', label: 'Created on' },
] as const;

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };

type Tournament = {
    id: number;
    name: string;
    date_from: string | null;
    date_to: string | null;
    created_at: string | null;
    venue: string | null;
    events_count: number;
    participants_count: number;
    teams_count: number;
    medals_count: number;
    team_medals_count: number;
    gold_medals_count: number;
    silver_medals_count: number;
    bronze_medals_count: number;
    merit_medals_count: number;
    session: Session | null;
    tier: { id: number; code: string; label: string } | null;
    sport: Sport | null;
    sports?: Sport[];
};

type PaginationLink = { url: string | null; label: string; active: boolean };
type PaginatedTournaments = {
    data: Tournament[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    q?: string;
    session_id?: string;
    tier_id?: string;
    sport_id?: string;
};

function tournamentSports(tournament: Tournament): Sport[] {
    const sportsById = new Map<number, Sport>();

    for (const sport of tournament.sports ?? []) {
        sportsById.set(sport.id, sport);
    }

    if (tournament.sport) {
        sportsById.set(tournament.sport.id, tournament.sport);
    }

    return Array.from(sportsById.values());
}

export default function TournamentsIndex({
    tournaments,
    filters,
    sessions,
    sports,
    tiers,
    defaultSessionId,
    selectedSessionId,
}: {
    tournaments: PaginatedTournaments;
    filters: Filters;
    defaultSessionId: number | null;
    selectedSessionId: number | null;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { locale = 'en' } = usePage().props as { locale?: string };
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [quickOverviewTournament, setQuickOverviewTournament] =
        useState<Tournament | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );

    setLayoutProps({
        breadcrumbs: [{ title: t('Tournaments') }],
    });
    const sessionDefaultValue = selectedSessionId
        ? String(selectedSessionId)
        : 'all';
    const defaultSessionFilter = defaultSessionId
        ? String(defaultSessionId)
        : undefined;

    function parseDateValue(value: string): Date | null {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDisplayDate(value: string | null): string {
        if (!value) {
            return '—';
        }

        const date = parseDateValue(value);

        if (!date) {
            return value;
        }

        return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
            dateStyle: 'medium',
        }).format(date);
    }

    function dateRange(tournament: Tournament): string {
        if (
            tournament.date_from &&
            tournament.date_to &&
            tournament.date_from !== tournament.date_to
        ) {
            return `${formatDisplayDate(tournament.date_from)} - ${formatDisplayDate(tournament.date_to)}`;
        }

        return formatDisplayDate(tournament.date_from ?? tournament.date_to);
    }

    function tournamentStatus(tournament: Tournament): string {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const from = tournament.date_from
            ? parseDateValue(tournament.date_from)
            : null;
        const to = tournament.date_to
            ? parseDateValue(tournament.date_to)
            : from;

        if (!from && !to) {
            return t('Date pending');
        }

        if (from && today < from) {
            return t('Upcoming');
        }

        if (to && today > to) {
            return t('Completed');
        }

        return t('Ongoing');
    }

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const merged: Filters = {
                q: query || undefined,
                session_id: filters.session_id,
                tier_id: filters.tier_id,
                sport_id: filters.sport_id,
                ...patch,
            };
            const clean: Record<string, string> = {};

            if (merged.q) {
                clean['filter[q]'] = merged.q;
            }

            if (merged.session_id) {
                clean['filter[session_id]'] = merged.session_id;
            }

            if (merged.tier_id) {
                clean['filter[tier_id]'] = merged.tier_id;
            }

            if (merged.sport_id) {
                clean['filter[sport_id]'] = merged.sport_id;
            }

            router.get(tournamentsIndex.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [query, filters.session_id, filters.tier_id, filters.sport_id],
    );

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(
            () => applyFilters({ q: query || undefined }),
            400,
        );

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    function handleTournamentReportPrint(tournamentId: number) {
        const url = eventsReport.url(tournamentId);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function handleTournamentReportExport(tournamentId: number) {
        window.location.href = eventsExport.url(tournamentId);
    }

    function toggleRow(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function togglePage() {
        const pageIds = tournaments.data.map((t_) => t_.id);
        const allSelected = pageIds.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);

            for (const id of pageIds) {
                if (allSelected) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            }

            return next;
        });
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        if (selectedIds.size > 0) {
            for (const id of selectedIds) {
                params.append('ids[]', String(id));
            }
        } else {
            if (filters.q) {
                params.append('filter[q]', filters.q);
            }

            if (filters.session_id) {
                params.append('filter[session_id]', filters.session_id);
            }

            if (filters.tier_id) {
                params.append('filter[tier_id]', filters.tier_id);
            }

            if (filters.sport_id) {
                params.append('filter[sport_id]', filters.sport_id);
            }
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportTournamentsUrl.url() + '?' + params.toString();
    }

    const hasActive = !!(
        filters.q ||
        filters.tier_id ||
        filters.sport_id ||
        (filters.session_id && filters.session_id !== defaultSessionFilter)
    );
    const sessionItems = [
        { value: 'all', label: t('All sessions') },
        ...sessions.map((session) => ({
            value: String(session.id),
            label: session.name,
        })),
    ];
    const tierItems = [
        { value: 'all', label: t('All tiers') },
        ...tiers.map((tier) => ({
            value: String(tier.id),
            label: tier.label,
            description: tier.code,
        })),
    ];
    const sportItems = [
        { value: 'all', label: t('All sports') },
        ...sports.map((sport) => ({
            value: String(sport.id),
            label: sport.name,
        })),
    ];

    return (
        <>
            <Head title={t('Tournaments')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Tournaments')}
                        description={t('Manage tournaments')}
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportOpen(true)}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {selectedIds.size > 0
                                ? t('Export :n selected').replace(
                                      ':n',
                                      String(selectedIds.size),
                                  )
                                : t('Export tournaments')}
                        </Button>
                        <Button asChild size="sm">
                            <Link href={createTournament.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New tournament')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search tournaments…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Combobox
                        value={filters.session_id ?? sessionDefaultValue}
                        onValueChange={(v) =>
                            applyFilters({
                                session_id:
                                    !v || v === 'all' ? undefined : v,
                            })
                        }
                        items={sessionItems}
                        placeholder={t('All sessions')}
                        searchPlaceholder={t('Search sessions…')}
                        emptyMessage={t('No sessions found.')}
                        className="w-44"
                    />
                    <Combobox
                        value={filters.tier_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                tier_id: !v || v === 'all' ? undefined : v,
                            })
                        }
                        items={tierItems}
                        placeholder={t('All tiers')}
                        searchPlaceholder={t('Search tiers…')}
                        emptyMessage={t('No tiers found.')}
                        className="w-40"
                    />
                    <Combobox
                        value={filters.sport_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                sport_id: !v || v === 'all' ? undefined : v,
                            })
                        }
                        items={sportItems}
                        placeholder={t('All sports')}
                        searchPlaceholder={t('Search sports…')}
                        emptyMessage={t('No sports found.')}
                        className="w-44"
                    />
                    {hasActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                router.get(
                                    tournamentsIndex.url(),
                                    {},
                                    { preserveState: false, replace: true },
                                );
                            }}
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            {t('Clear filters')}
                        </Button>
                    )}
                </div>

                {/* Table */}
                <ListingPagination
                    paginator={tournaments}
                    itemLabel={t('tournaments')}
                    className="sticky top-0 z-40 shadow-sm"
                />
                <div className="max-w-full overflow-x-auto rounded-xl border bg-card">
                    <Table className="min-w-[1700px] table-fixed text-[12px] leading-tight [&_td]:px-2 [&_td]:py-2 [&_th]:h-9 [&_th]:px-2 [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:whitespace-nowrap">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={
                                            tournaments.data.length > 0 &&
                                            tournaments.data.every((t_) =>
                                                selectedIds.has(t_.id),
                                            )
                                                ? true
                                                : tournaments.data.some((t_) =>
                                                        selectedIds.has(t_.id),
                                                    )
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={togglePage}
                                        aria-label={t('Select all on page')}
                                    />
                                </TableHead>
                                <TableHead className="w-12">
                                    {t('S.No.')}
                                </TableHead>
                                <TableHead className="w-[260px]">
                                    {t('Name')}
                                </TableHead>
                                <TableHead className="w-[150px]">
                                    {t('Session')}
                                </TableHead>
                                <TableHead className="w-[110px]">
                                    {t('Tier')}
                                </TableHead>
                                <TableHead className="w-[170px]">
                                    {t('Sport')}
                                </TableHead>
                                <TableHead className="w-[170px]">
                                    {t('Venue')}
                                </TableHead>
                                <TableHead className="w-[170px]">
                                    {t('Dates')}
                                </TableHead>
                                <TableHead className="w-[105px]">
                                    {t('Status')}
                                </TableHead>
                                <TableHead className="w-16 text-right">
                                    {t('Events')}
                                </TableHead>
                                <TableHead className="w-20 text-right">
                                    {t('Participants')}
                                </TableHead>
                                <TableHead className="w-16 text-right">
                                    {t('Teams')}
                                </TableHead>
                                <TableHead className="w-20 text-right">
                                    {t('Team Medals')}
                                </TableHead>
                                <TableHead className="w-14 text-right">
                                    {t('Gold')}
                                </TableHead>
                                <TableHead className="w-14 text-right">
                                    {t('Silver')}
                                </TableHead>
                                <TableHead className="w-14 text-right">
                                    {t('Bronze')}
                                </TableHead>
                                <TableHead className="w-14 text-right">
                                    {t('Merit')}
                                </TableHead>
                                <TableHead className="w-16 text-right">
                                    {t('Medals')}
                                </TableHead>
                                <TableHead className="w-[110px]">
                                    {t('Created')}
                                </TableHead>
                                <TableHead className="sticky right-0 z-20 w-[136px] bg-card text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tournaments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={20}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        {hasActive
                                            ? t(
                                                  'No tournaments match your filters.',
                                              )
                                            : t('No tournaments yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tournaments.data.map((t_, index) => (
                                    <TableRow key={t_.id}>
                                        <TableCell className="w-10">
                                            <Checkbox
                                                checked={selectedIds.has(t_.id)}
                                                onCheckedChange={() =>
                                                    toggleRow(t_.id)
                                                }
                                                aria-label={t('Select row')}
                                            />
                                        </TableCell>
                                        <TableCell className="w-12 text-xs text-muted-foreground tabular-nums">
                                            {(typeof tournaments.from ===
                                            'number'
                                                ? tournaments.from
                                                : 1) + index}
                                        </TableCell>
                                        <TableCell className="w-[260px] max-w-[260px] overflow-hidden font-medium">
                                            <Link
                                                href={showTournament.url(t_.id)}
                                                className="flex w-full min-w-0 items-center gap-2 hover:underline"
                                                title={t_.name}
                                            >
                                                <Trophy className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                <span className="truncate">
                                                    {t_.name}
                                                </span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="max-w-[150px] text-muted-foreground">
                                            <span
                                                className="block truncate"
                                                title={t_.session?.name}
                                            >
                                                {t_.session?.name ?? '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {t_.tier ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                >
                                                    {t_.tier.label}
                                                </Badge>
                                            ) : (
                                                <span className="text-border select-none">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[170px] text-muted-foreground">
                                            {(() => {
                                                const sportsList =
                                                    tournamentSports(t_);
                                                const title = sportsList
                                                    .map((sport) => sport.name)
                                                    .join(', ');

                                                return sportsList.length > 0 ? (
                                                    <div
                                                        className="flex min-w-0 flex-wrap gap-1"
                                                        title={title}
                                                    >
                                                        {sportsList
                                                            .slice(0, 2)
                                                            .map((sport) => (
                                                                <Badge
                                                                    key={
                                                                        sport.id
                                                                    }
                                                                    variant="outline"
                                                                    className="max-w-[74px] truncate border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                                                                >
                                                                    {sport.name}
                                                                </Badge>
                                                            ))}
                                                        {sportsList.length >
                                                            2 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="px-1.5 py-0 text-[10px]"
                                                            >
                                                                +
                                                                {sportsList.length -
                                                                    2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-border select-none">
                                                        —
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="max-w-[170px] text-muted-foreground">
                                            <div
                                                className="flex min-w-0 items-center gap-1.5"
                                                title={t_.venue ?? undefined}
                                            >
                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                                <span className="truncate">
                                                    {t_.venue ?? '—'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                                                <span>{dateRange(t_)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tournamentStatus(t_)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {t_.events_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <span className="inline-flex items-center justify-end gap-1">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                {t_.participants_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {t_.teams_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {t_.team_medals_count}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-amber-700 tabular-nums dark:text-amber-300">
                                            {t_.gold_medals_count}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-600 tabular-nums dark:text-slate-300">
                                            {t_.silver_medals_count}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-orange-700 tabular-nums dark:text-orange-300">
                                            {t_.bronze_medals_count}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-emerald-700 tabular-nums dark:text-emerald-300">
                                            {t_.merit_medals_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <span className="inline-flex items-center justify-end gap-1">
                                                <Medal className="h-3.5 w-3.5 text-amber-500" />
                                                {t_.medals_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDisplayDate(t_.created_at)}
                                        </TableCell>
                                        <TableCell className="sticky right-0 z-10 w-[136px] bg-card">
                                            <div className="flex justify-end gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={t('Print report')}
                                                    onClick={() =>
                                                        handleTournamentReportPrint(
                                                            t_.id,
                                                        )
                                                    }
                                                >
                                                    <Printer className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={t('Excel export')}
                                                    onClick={() =>
                                                        handleTournamentReportExport(
                                                            t_.id,
                                                        )
                                                    }
                                                >
                                                    <FileDown className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={t('Quick overview')}
                                                    onClick={() =>
                                                        setQuickOverviewTournament(
                                                            t_,
                                                        )
                                                    }
                                                >
                                                    <Info className="h-4 w-4 text-amber-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title={t('View')}
                                                    asChild
                                                >
                                                    <Link
                                                        href={showTournament.url(
                                                            t_.id,
                                                        )}
                                                    >
                                                        <Eye className="h-4 w-4 text-sky-600" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedIds={selectedIds}
                tournaments={tournaments}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                buildExportUrl={buildExportUrl}
                t={t}
            />

            <QuickOverviewDialog
                open={quickOverviewTournament !== null}
                tournament={quickOverviewTournament}
                onOpenChange={(open) =>
                    !open && setQuickOverviewTournament(null)
                }
                formatDisplayDate={formatDisplayDate}
                t={t}
            />
        </>
    );
}

function QuickOverviewDialog({
    open,
    tournament,
    onOpenChange,
    formatDisplayDate,
    t,
}: {
    open: boolean;
    tournament: Tournament | null;
    onOpenChange: (open: boolean) => void;
    formatDisplayDate: (value: string | null) => string;
    t: (key: string) => string;
}) {
    if (!tournament) {
        return null;
    }

    const sports = tournamentSports(tournament);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Quick overview')}</DialogTitle>
                    <DialogDescription>{tournament.name}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Session')}
                        </span>
                        <span className="font-medium">
                            {tournament.session?.name ?? '—'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Tier')}
                        </span>
                        <span className="font-medium">
                            {tournament.tier?.label ?? '—'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Sport')}
                        </span>
                        <span className="font-medium">
                            {sports.length > 0
                                ? sports.map((sport) => sport.name).join(', ')
                                : '—'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Venue')}
                        </span>
                        <span className="font-medium">
                            {tournament.venue ?? '—'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Date from')}
                        </span>
                        <span className="font-medium">
                            {formatDisplayDate(tournament.date_from)}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Date to')}
                        </span>
                        <span className="font-medium">
                            {formatDisplayDate(tournament.date_to)}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Events')}
                        </span>
                        <span className="font-medium">
                            {tournament.events_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Participants')}
                        </span>
                        <span className="font-medium">
                            {tournament.participants_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Teams')}
                        </span>
                        <span className="font-medium">
                            {tournament.teams_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Team Medals')}
                        </span>
                        <span className="font-medium">
                            {tournament.team_medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Gold')}
                        </span>
                        <span className="font-medium">
                            {tournament.gold_medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Silver')}
                        </span>
                        <span className="font-medium">
                            {tournament.silver_medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Bronze')}
                        </span>
                        <span className="font-medium">
                            {tournament.bronze_medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Merit')}
                        </span>
                        <span className="font-medium">
                            {tournament.merit_medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Medals')}
                        </span>
                        <span className="font-medium">
                            {tournament.medals_count}
                        </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                            {t('Created')}
                        </span>
                        <span className="font-medium">
                            {formatDisplayDate(tournament.created_at)}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    selectedIds,
    tournaments,
    selectedColumns,
    setSelectedColumns,
    buildExportUrl,
    t,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selectedIds: Set<number>;
    tournaments: PaginatedTournaments;
    selectedColumns: string[];
    setSelectedColumns: Dispatch<SetStateAction<string[]>>;
    buildExportUrl: () => string;
    t: (key: string) => string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Export tournaments')}</DialogTitle>
                    <DialogDescription>
                        {selectedIds.size > 0
                            ? t('Exporting :n selected tournaments.').replace(
                                  ':n',
                                  String(selectedIds.size),
                              )
                            : t('Exporting all :count tournaments.').replace(
                                  ':count',
                                  String(tournaments.total),
                              )}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <p className="mb-3 text-sm font-medium">
                        {t('Select columns to export')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {ALL_COLUMNS.map((col) => (
                            <div
                                key={col.key}
                                className="flex items-center gap-2"
                            >
                                <Checkbox
                                    id={`col-${col.key}`}
                                    checked={selectedColumns.includes(col.key)}
                                    onCheckedChange={(checked) =>
                                        setSelectedColumns((prev) =>
                                            checked
                                                ? [...prev, col.key]
                                                : prev.filter(
                                                      (k) => k !== col.key,
                                                  ),
                                        )
                                    }
                                />
                                <Label htmlFor={`col-${col.key}`}>
                                    {t(col.label)}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            window.location.href = buildExportUrl();
                            onOpenChange(false);
                        }}
                    >
                        <Download className="mr-1.5 h-4 w-4" />
                        {t('Download Excel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
