import { Head, Link, router, setLayoutProps, usePage } from '@inertiajs/react';
import {
    Download,
    Eye,
    Info,
    Medal,
    FileDown,
    Plus,
    Search,
    Printer,
    Trophy,
    X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

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

        return exportTournamentsUrl.url() + '?' + params.toString();
    }

    function escapePrintValue(
        value: string | number | null | undefined,
    ): string {
        return String(value ?? '—')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function printSportRows(tournament: Tournament): string {
        const sportsList = tournamentSports(tournament);

        if (sportsList.length === 0) {
            return '—';
        }

        if (sportsList.length === 1) {
            return escapePrintValue(sportsList[0].name);
        }

        return `<table class="sub-table sports-sub-table">${sportsList
            .map(
                (sport, index) =>
                    `<tr><td class="sno">${index + 1}</td><td>${escapePrintValue(
                        sport.name,
                    )}</td></tr>`,
            )
            .join('')}</table>`;
    }

    function printDetailsRows(tournament: Tournament): string {
        return `<table class="sub-table">
            <tr><th>${escapePrintValue(t('Venue'))}</th><td>${escapePrintValue(tournament.venue)}</td></tr>
            <tr><th>${escapePrintValue(t('Date'))}</th><td>${escapePrintValue(dateRange(tournament))}</td></tr>
            <tr><th>${escapePrintValue(t('Status'))}</th><td>${escapePrintValue(tournamentStatus(tournament))}</td></tr>
        </table>`;
    }

    function printActivityRows(tournament: Tournament): string {
        return `<table class="sub-table">
            <tr><th>${escapePrintValue(t('Events'))}</th><td>${escapePrintValue(tournament.events_count)}</td></tr>
            <tr><th>${escapePrintValue(t('Participants'))}</th><td>${escapePrintValue(tournament.participants_count)}</td></tr>
        </table>`;
    }

    function handleListingPrint() {
        const rows =
            selectedIds.size > 0
                ? tournaments.data.filter((tournament) =>
                      selectedIds.has(tournament.id),
                  )
                : tournaments.data;
        const title = t('Tournaments');
        const bodyRows = rows
            .map(
                (tournament, index) => `<tr>
                    <td class="num">${index + 1}</td>
                    <td>${escapePrintValue(tournament.name)}</td>
                    <td>${escapePrintValue(tournament.tier?.label)}</td>
                    <td>${printSportRows(tournament)}</td>
                    <td>${printDetailsRows(tournament)}</td>
                    <td>${printActivityRows(tournament)}</td>
                    <td class="num medal-gold">${escapePrintValue(tournament.gold_medals_count)}</td>
                    <td class="num medal-silver">${escapePrintValue(tournament.silver_medals_count)}</td>
                    <td class="num medal-bronze">${escapePrintValue(tournament.bronze_medals_count)}</td>
                    <td class="num medal-merit">${escapePrintValue(tournament.merit_medals_count)}</td>
                    <td class="num medal-total">${escapePrintValue(tournament.medals_count)}</td>
                </tr>`,
            )
            .join('');
        const printWindow = window.open('', '_blank');

        if (!printWindow?.document) {
            return;
        }

        printWindow.document
            .write(`<!DOCTYPE html><html><head><meta charset="utf-8">
            <title>${escapePrintValue(title)}</title>
            <style>
                @page{size:A4 landscape;margin:6mm}
                body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#111;margin:0;padding:6px}
                .watermark{position:fixed;top:50%;left:50%;width:520px;height:520px;transform:translate(-50%,-50%);object-fit:contain;opacity:.045;z-index:0}
                .print-content{position:relative;z-index:1}
                .letterhead{display:flex;align-items:center;gap:12px;border-bottom:2px solid #171717;margin-bottom:8px;padding:0 0 7px}
                .letterhead-logo{width:58px;height:58px;object-fit:contain;flex-shrink:0}
                .letterhead-spacer{width:58px;flex-shrink:0}
                .letterhead-body{min-width:0;flex:1;text-align:center}
                .letterhead h1{font-size:16px;margin:0;text-transform:uppercase;color:#111;letter-spacing:.3px}
                .letterhead p{margin:3px 0 0;font-size:10px;color:#404040}
                h2{font-size:14px;text-align:center;margin:0 0 8px}
                table{width:100%;border-collapse:collapse;table-layout:fixed}
                th,td{border:1px solid #999;padding:4px;vertical-align:middle;text-align:center}
                thead th{background:#fff;color:#111;font-weight:700}
                td{text-align:center;word-break:break-word}
                tbody tr:nth-child(even)>td{background:#fff}
                .num{white-space:nowrap;text-align:center}
                .sub-table{background:#fff}
                .sub-table th,.sub-table td{border:1px solid #94a3b8;padding:3px;font-size:9px;background:#fff}
                .sub-table th{width:38%;background:#fff;color:#111;font-weight:700}
                .sub-table .sno{width:24px;font-weight:700;color:#111;background:#fff}
                .sports-sub-table td:last-child{font-weight:600;color:#111827}
                .medal-gold,.medal-silver,.medal-bronze,.medal-merit,.medal-total{background:#fff!important;color:#111;font-weight:700}
                @media print{body{padding:0}th,td{padding:3px}.sub-table th,.sub-table td{padding:2px}.letterhead{padding:5px 8px}}
            </style></head><body>
            <img class="watermark" src="/logo.jpg" alt="">
            <div class="print-content">
            <div class="letterhead">
                <img class="letterhead-logo" src="/logo.jpg" alt="${escapePrintValue(t('UP Police Sports Control Board (UPPSCB)'))}">
                <div class="letterhead-body">
                    <h1>${escapePrintValue(t('UP Police Sports Control Board (UPPSCB)'))}</h1>
                    <p>${escapePrintValue(t('Tournament Listing'))}</p>
                    <p>${escapePrintValue(t('Official print preview'))}</p>
                </div>
                <div class="letterhead-spacer" aria-hidden="true"></div>
            </div>
            <h2>${escapePrintValue(title)}</h2>
            <table>
                <colgroup>
                    <col style="width:4%">
                    <col style="width:13%">
                    <col style="width:8%">
                    <col style="width:13%">
                    <col style="width:20%">
                    <col style="width:12%">
                    <col style="width:5%">
                    <col style="width:5%">
                    <col style="width:5%">
                    <col style="width:5%">
                    <col style="width:10%">
                </colgroup>
                <thead><tr>
                    <th>${escapePrintValue(t('S.No.'))}</th>
                    <th>${escapePrintValue(t('Tournament'))}</th>
                    <th>${escapePrintValue(t('Tier'))}</th>
                    <th>${escapePrintValue(t('Sports'))}</th>
                    <th>${escapePrintValue(t('Venue / Date / Status'))}</th>
                    <th>${escapePrintValue(t('Activity'))}</th>
                    <th>${escapePrintValue(t('Gold'))}</th>
                    <th>${escapePrintValue(t('Silver'))}</th>
                    <th>${escapePrintValue(t('Bronze'))}</th>
                    <th>${escapePrintValue(t('Merit'))}</th>
                    <th>${escapePrintValue(t('Medals'))}</th>
                </tr></thead>
                <tbody>${bodyRows || `<tr><td colspan="11">${escapePrintValue(t('No tournaments to print.'))}</td></tr>`}</tbody>
            </table>
            </div>
            <script>window.onload=function(){window.print();}</script>
        </body></html>`);
        printWindow.document.close();
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

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleListingPrint}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {selectedIds.size > 0
                                ? t('Print :n selected').replace(
                                      ':n',
                                      String(selectedIds.size),
                                  )
                                : t('Print listing')}
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
                <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
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
                                session_id: !v || v === 'all' ? undefined : v,
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
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm [&>[data-slot=table-container]]:h-full">
                    <Table className="min-w-[1700px] table-fixed text-[12px] leading-tight [&_td]:px-2 [&_td]:py-2 [&_th]:h-9 [&_th]:px-2 [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:whitespace-nowrap">
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow className="bg-muted hover:bg-muted">
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
                                <TableHead className="w-[110px]">
                                    {t('Tier')}
                                </TableHead>
                                <TableHead className="w-[170px]">
                                    {t('Sport')}
                                </TableHead>
                                <TableHead className="w-[240px]">
                                    {t('Venue / Date / Status')}
                                </TableHead>
                                <TableHead className="w-[150px]">
                                    {t('Activity')}
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
                                        colSpan={14}
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
                                        <TableCell className="w-[260px] max-w-[260px] overflow-hidden">
                                            <Link
                                                href={showTournament.url(t_.id)}
                                                className="flex w-full min-w-0 items-center gap-2 font-medium hover:underline"
                                                title={t_.name}
                                            >
                                                <Trophy className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                <span className="truncate">
                                                    {t_.name}
                                                </span>
                                            </Link>
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
                                        <TableCell className="max-w-[300px] text-muted-foreground">
                                            {(() => {
                                                const sportsList =
                                                    tournamentSports(t_);
                                                const sportPairs: Sport[][] =
                                                    [];

                                                for (
                                                    let sportIndex = 0;
                                                    sportIndex <
                                                    sportsList.length;
                                                    sportIndex += 2
                                                ) {
                                                    sportPairs.push(
                                                        sportsList.slice(
                                                            sportIndex,
                                                            sportIndex + 2,
                                                        ),
                                                    );
                                                }

                                                return sportsList.length ===
                                                    1 ? (
                                                    <div className="px-2 py-1 text-[11px] font-medium text-foreground">
                                                        {sportsList[0].name}
                                                    </div>
                                                ) : sportsList.length > 0 ? (
                                                    <div className="overflow-hidden rounded-md border border-border">
                                                        <table className="w-full text-[11px]">
                                                            <tbody>
                                                                {sportPairs.map(
                                                                    (
                                                                        pair,
                                                                        pairIndex,
                                                                    ) => (
                                                                        <tr
                                                                            key={`sport-row-${pairIndex}`}
                                                                            className="border-b border-sky-100 last:border-b-0 dark:border-sky-900/60"
                                                                        >
                                                                            {pair.map(
                                                                                (
                                                                                    sport,
                                                                                    sportOffset,
                                                                                ) => (
                                                                                    <Fragment
                                                                                        key={
                                                                                            sport.id
                                                                                        }
                                                                                    >
                                                                                        <td className="w-8 border-r border-border px-2 py-1 text-center font-medium text-muted-foreground tabular-nums">
                                                                                            {pairIndex *
                                                                                                2 +
                                                                                                sportOffset +
                                                                                                1}
                                                                                        </td>
                                                                                        <td className="w-1/2 border-r border-border px-2 py-1 font-medium text-foreground">
                                                                                            {
                                                                                                sport.name
                                                                                            }
                                                                                        </td>
                                                                                    </Fragment>
                                                                                ),
                                                                            )}
                                                                            {pair.length ===
                                                                                1 && (
                                                                                <>
                                                                                    <td className="w-8 border-r border-border px-2 py-1" />
                                                                                    <td className="w-1/2 px-2 py-1" />
                                                                                </>
                                                                            )}
                                                                        </tr>
                                                                    ),
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <span className="text-border select-none">
                                                        —
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="max-w-[240px] text-muted-foreground">
                                            <div className="overflow-hidden rounded-md border border-border">
                                                <table className="w-full text-[11px]">
                                                    <tbody>
                                                        <tr className="border-b border-border">
                                                            <td className="w-20 border-r border-border px-2 py-1 font-medium text-muted-foreground">
                                                                {t('Venue')}
                                                            </td>
                                                            <td
                                                                className="px-2 py-1 font-medium text-foreground"
                                                                title={
                                                                    t_.venue ??
                                                                    undefined
                                                                }
                                                            >
                                                                <span className="line-clamp-2">
                                                                    {t_.venue ??
                                                                        '—'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-border">
                                                            <td className="w-20 border-r border-border px-2 py-1 font-medium text-muted-foreground">
                                                                {t('Date')}
                                                            </td>
                                                            <td className="px-2 py-1 font-medium text-foreground">
                                                                {dateRange(t_)}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="w-20 border-r border-border px-2 py-1 font-medium text-muted-foreground">
                                                                {t('Status')}
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <Badge variant="outline">
                                                                    {tournamentStatus(
                                                                        t_,
                                                                    )}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[150px]">
                                            <div className="overflow-hidden rounded-md border border-border">
                                                <table className="w-full text-[11px]">
                                                    <tbody>
                                                        <tr className="border-b border-border">
                                                            <td className="w-24 border-r border-border px-2 py-1 font-medium text-muted-foreground">
                                                                {t('Events')}
                                                            </td>
                                                            <td className="px-2 py-1 text-center font-medium text-foreground tabular-nums">
                                                                {
                                                                    t_.events_count
                                                                }
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="w-24 border-r border-border px-2 py-1 font-medium text-muted-foreground">
                                                                {t(
                                                                    'Participants',
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1 text-center font-medium text-foreground tabular-nums">
                                                                {
                                                                    t_.participants_count
                                                                }
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
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

                <ListingPagination
                    paginator={tournaments}
                    itemLabel={t('tournaments')}
                    className="shrink-0 shadow-sm"
                />
            </div>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedIds={selectedIds}
                tournaments={tournaments}
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
    buildExportUrl,
    t,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selectedIds: Set<number>;
    tournaments: PaginatedTournaments;
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
                    <p className="text-sm font-medium">
                        {t('Excel will use the same columns as this listing.')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('Actions are not included in the Excel file.')}
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
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
