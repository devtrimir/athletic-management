import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    Download,
    Eye,
    IdCard,
    Info,
    Mail,
    MapPin,
    Phone,
    Plus,
    Printer,
    Search,
    ShieldCheck,
    Trophy,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamsUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import Heading from '@/components/heading';
import { TeamQuickView } from '@/components/teams/team-quick-view';
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

const ALL_COLUMNS = [
    { key: 'serial_no', label: 'S.No.' },
    { key: 'name', label: 'Team Name' },
    { key: 'sport', label: 'Sport' },
    { key: 'session', label: 'Session' },
    { key: 'posting', label: 'Posting / District' },
    { key: 'location_type', label: 'Location Type' },
    { key: 'district', label: 'District' },
    { key: 'unit', label: 'Unit' },
    { key: 'is_active', label: 'Status' },
    { key: 'in_charge', label: 'In-Charge' },
    { key: 'incharge_pno', label: 'In-Charge PNO' },
    { key: 'incharge_rank', label: 'In-Charge Rank' },
    { key: 'incharge_designation', label: 'In-Charge Designation' },
    { key: 'incharge_mobile', label: 'In-Charge Mobile' },
    { key: 'incharge_email', label: 'In-Charge Email' },
    { key: 'incharge_assigned_at', label: 'In-Charge Assigned On' },
    { key: 'players_count', label: 'Players' },
    { key: 'male_players_count', label: 'Male Players' },
    { key: 'female_players_count', label: 'Female Players' },
    { key: 'captains_count', label: 'Captains' },
    { key: 'reserves_count', label: 'Reserves' },
    { key: 'coaches_count', label: 'Coaches' },
] as const;

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type CurrentInchargeAssignment = {
    id: number;
    full_name: string;
    pno: string | null;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    assigned_at: string | null;
    assignment_reason: string | null;
    remarks: string | null;
} | null;

type Team = {
    id: number;
    name: string;
    in_charge: string | null;
    location_type: 'unit' | 'district';
    location_label: string | null;
    is_active: boolean;
    players_count: number;
    removed_players_count: number;
    male_players_count: number;
    female_players_count: number;
    captains_count: number;
    reserves_count: number;
    coaches_count: number;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    district: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
    current_incharge_assignment?: CurrentInchargeAssignment;
};

type PaginatedTeams = {
    data: Team[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    q?: string;
    pno?: string;
    session_id?: string;
    sport_id?: string;
    district_id?: string;
    unit_id?: string;
    location_type?: string;
};

type RefItem = { id: number; name: string };
type UnitItem = { id: number; name: string };

export default function TeamsIndex({
    teams,
    filters,
    selectedSessionId,
    sessions,
    sports,
    districts,
    units,
}: {
    teams: PaginatedTeams;
    filters: Filters;
    selectedSessionId: number | null;
    sessions: RefItem[];
    sports: RefItem[];
    districts: RefItem[];
    units: UnitItem[];
}) {
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [quickViewId, setQuickViewId] = useState<number | null>(null);
    const [quickViewSessionId, setQuickViewSessionId] = useState<string | null>(null);
    const [quickViewSessionName, setQuickViewSessionName] = useState<string | null>(
        null,
    );
    const [quickViewHistoricalSession, setQuickViewHistoricalSession] =
        useState(false);
    const [inchargeTeam, setInchargeTeam] = useState<Team | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );

    const [query, setQuery] = useState(filters.q ?? '');
    const [pnoQuery, setPnoQuery] = useState(filters.pno ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pnoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (patch: Partial<Filters>, preserveState = true) => {
            const current: Filters = {
                q: query || undefined,
                pno: pnoQuery || undefined,
                session_id: filters.session_id,
                sport_id: filters.sport_id,
                district_id: filters.district_id,
                unit_id: filters.unit_id,
                location_type: filters.location_type,
            };
            const merged: Filters = { ...current, ...patch };

            const clean: Record<string, string> = {};

            if (merged.q) {
                clean['filter[q]'] = merged.q;
            }

            if (merged.pno) {
                clean['filter[pno]'] = merged.pno;
            }

            if (merged.session_id) {
                clean['filter[session_id]'] = merged.session_id;
            }

            if (merged.sport_id) {
                clean['filter[sport_id]'] = merged.sport_id;
            }

            if (merged.unit_id) {
                clean['filter[unit_id]'] = merged.unit_id;
            }

            if (merged.district_id) {
                clean['filter[district_id]'] = merged.district_id;
            }

            if (merged.location_type) {
                clean['filter[location_type]'] = merged.location_type;
            }

            router.get(TeamController.index.url(), clean, {
                preserveState,
                replace: true,
            });
        },
        [
            query,
            pnoQuery,
            filters.session_id,
            filters.sport_id,
            filters.district_id,
            filters.unit_id,
            filters.location_type,
        ],
    );

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            applyFilters({ q: query || undefined });
        }, 400);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    useEffect(() => {
        if (pnoDebounceRef.current) {
            clearTimeout(pnoDebounceRef.current);
        }

        pnoDebounceRef.current = setTimeout(() => {
            applyFilters({ pno: pnoQuery || undefined });
        }, 400);

        return () => {
            if (pnoDebounceRef.current) {
                clearTimeout(pnoDebounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pnoQuery]);

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
        const pageIds = teams.data.map((t) => t.id);
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

    function openQuickView(teamId: number) {
        const sessionId = filters.session_id ??
            (selectedSessionId ? String(selectedSessionId) : null);
        const sessionName = sessions.find(
            (session) => String(session.id) === sessionId,
        )?.name ?? null;

        setQuickViewId(teamId);
        setQuickViewSessionId(sessionId);
        setQuickViewSessionName(sessionName);
        setQuickViewHistoricalSession(
            selectedSessionId !== null &&
                sessionId !== null &&
                Number(sessionId) !== selectedSessionId,
        );
    }

    function currentIncharge(team: Team): CurrentInchargeAssignment {
        return team.current_incharge_assignment ?? null;
    }

    function inchargeName(team: Team): string | null {
        return currentIncharge(team)?.full_name ?? team.in_charge;
    }

    function inchargePno(team: Team): string | null {
        return currentIncharge(team)?.pno ?? null;
    }

    const selectedSession = sessions.find(
        (session) => String(session.id) === filters.session_id,
    ) ?? null;
    const currentSession = selectedSessionId
        ? sessions.find((session) => session.id === selectedSessionId)
        : null;
    const viewingArchivedSession =
        selectedSessionId !== null &&
        selectedSession !== null &&
        selectedSession.id !== selectedSessionId;

    function postingPrimary(team: Team): string | null {
        if (team.location_type === 'unit') {
            return team.unit?.name ?? team.location_label;
        }

        return team.district?.name ?? team.location_label;
    }

    function postingSecondary(team: Team): string | null {
        if (team.location_type === 'unit') {
            return team.district?.name ?? null;
        }

        return null;
    }

    function printValue(
        team: Team,
        column: string,
        serialNumber: number,
    ): string {
        if (column === 'serial_no') {
            return String(serialNumber);
        }

        if (column === 'session') {
            return selectedSession?.name ?? '';
        }

        if (column === 'sport') {
            return team.sport?.name ?? '';
        }

        if (column === 'posting') {
            return (
                [postingPrimary(team), postingSecondary(team)]
                    .filter(Boolean)
                    .join(' / ') || ''
            );
        }

        if (column === 'location_type') {
            return team.location_type === 'unit' ? t('Unit') : t('District');
        }

        if (column === 'district') {
            return team.district?.name ?? '';
        }

        if (column === 'unit') {
            return team.unit?.name ?? '';
        }

        if (column === 'is_active') {
            return team.is_active ? t('Active') : t('Inactive');
        }

        if (column === 'in_charge') {
            return inchargeName(team) ?? '';
        }

        if (column === 'incharge_pno') {
            return inchargePno(team) ?? '';
        }

        if (column === 'incharge_rank') {
            return currentIncharge(team)?.rank ?? '';
        }

        if (column === 'incharge_designation') {
            return currentIncharge(team)?.designation ?? '';
        }

        if (column === 'incharge_mobile') {
            return currentIncharge(team)?.mobile ?? '';
        }

        if (column === 'incharge_email') {
            return currentIncharge(team)?.email ?? '';
        }

        if (column === 'incharge_assigned_at') {
            return currentIncharge(team)?.assigned_at ?? '';
        }

        const raw = (team as Record<string, unknown>)[column];

        return raw != null && raw !== '' ? String(raw) : '';
    }

    function dash() {
        return <span className="text-border select-none" />;
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

            if (filters.pno) {
                params.append('filter[pno]', filters.pno);
            }

            if (filters.session_id) {
                params.append('filter[session_id]', filters.session_id);
            }

            if (filters.sport_id) {
                params.append('filter[sport_id]', filters.sport_id);
            }

            if (filters.district_id) {
                params.append('filter[district_id]', filters.district_id);
            }

            if (filters.unit_id) {
                params.append('filter[unit_id]', filters.unit_id);
            }

            if (filters.location_type) {
                params.append('filter[location_type]', filters.location_type);
            }
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportTeamsUrl.url() + '?' + params.toString();
    }

    function teamShowUrl(teamId: number): string {
        const url = TeamController.show.url(teamId);

        if (!filters.session_id) {
            return url;
        }

        return `${url}?filter[session_id]=${filters.session_id}`;
    }

    function handlePrint() {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const headers = cols.map((c) => `<th>${t(c.label)}</th>`).join('');
        const bodyRows = teams.data
            .map(
                (team, index) =>
                    `<tr>${cols
                        .map(
                            (c) =>
                                `<td>${printValue(
                                    team,
                                    c.key,
                                    (teams.from ?? 1) + index,
                                )}</td>`,
                        )
                        .join('')}</tr>`,
            )
            .join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Teams')}</title><style>body{font-family:sans-serif;font-size:12px;padding:16px}h2{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Teams')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
    }

    const hasActiveFilters = !!(
        filters.q ||
        filters.pno ||
        filters.sport_id ||
        filters.district_id ||
        filters.unit_id ||
        filters.location_type
    );

    return (
        <>
            <Head title={t('Teams')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Teams')}
                        description={t('Manage teams')}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                        <Select
                            value={
                                filters.session_id ??
                                (selectedSessionId
                                    ? String(selectedSessionId)
                                    : '')
                            }
                            onValueChange={(v) =>
                                applyFilters({ session_id: v }, false)
                            }
                        >
                            <SelectTrigger className="w-48">
                                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder={t('Session')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                : t('Export teams')}
                        </Button>
                        <Button asChild size="sm">
                            <Link href={TeamController.create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New team')}
                            </Link>
                        </Button>
                    </div>
                </div>
                {viewingArchivedSession && currentSession && selectedSession ? (
                    <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/30 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                            <span className="font-medium">
                                {t('Archived roster view')}
                            </span>
                            <span>·</span>
                            <span>{selectedSession?.name}</span>
                            <span>·</span>
                            <span>
                                {t('Current session')}: {currentSession.name}
                            </span>
                        </div>
                    </div>
                ) : null}

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                    <div className="relative w-52">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search team or in-charge…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <div className="relative w-40">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search by PNO…')}
                            value={pnoQuery}
                            onChange={(e) => setPnoQuery(e.target.value)}
                            className="pl-8 font-mono"
                        />
                    </div>

                    <Select
                        value={filters.sport_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                sport_id: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sports')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All sports')}
                            </SelectItem>
                            {sports.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.location_type ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                location_type: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All locations')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All locations')}
                            </SelectItem>
                            <SelectItem value="unit">{t('Unit')}</SelectItem>
                            <SelectItem value="district">
                                {t('District')}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.district_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                district_id: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All districts')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All districts')}
                            </SelectItem>
                            {districts.map((district) => (
                                <SelectItem
                                    key={district.id}
                                    value={String(district.id)}
                                >
                                    {district.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.unit_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                unit_id: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All units')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All units')}
                            </SelectItem>
                            {units.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                setPnoQuery('');
                                router.get(
                                    TeamController.index.url(),
                                    {},
                                    {
                                        preserveState: false,
                                        replace: true,
                                    },
                                );
                            }}
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            {t('Clear filters')}
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                    <div className="min-w-[1160px]">
                        <Table>
                        <TableHeader>
                                <TableRow className="bg-muted/80 hover:bg-muted/90">
                                <TableHead className="w-0">
                                    <Checkbox
                                        checked={
                                            teams.data.length > 0 &&
                                            teams.data.every((t) =>
                                                selectedIds.has(t.id),
                                            )
                                                ? true
                                                : teams.data.some((t) =>
                                                        selectedIds.has(t.id),
                                                    )
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={togglePage}
                                        aria-label={t('Select all on page')}
                                    />
                                </TableHead>
                                <TableHead className="w-16 text-center">
                                    {t('S.No.')}
                                </TableHead>
                                <TableHead>{t('Team')}</TableHead>
                                <TableHead className="w-24">{t('Status')}</TableHead>
                                <TableHead>{t('Posting / District')}</TableHead>
                                <TableHead>{t('In-charge')}</TableHead>
                                <TableHead>{t('Players')}</TableHead>
                                <TableHead>{t('Staff')}</TableHead>
                                <TableHead className="w-0 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teams.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={9}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                        {hasActiveFilters
                                            ? t('No teams match your filters.')
                                            : t('No teams yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teams.data.map((team, index) => {
                                    const assignedIncharge =
                                        currentIncharge(team);
                                    const visibleIncharge = inchargeName(team);
                                    const serialNumber =
                                        (teams.from ?? 1) + index;

                                    return (
                                        <TableRow
                                            key={team.id}
                                            className="group cursor-pointer border-l-4 border-l-transparent transition-colors hover:border-l-primary/70 hover:bg-sky-50/60 dark:hover:bg-sky-950/20"
                                            onClick={() =>
                                                openQuickView(team.id)
                                            }
                                        >
                                            <TableCell className="w-0">
                                                <Checkbox
                                                    checked={selectedIds.has(
                                                        team.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleRow(team.id)
                                                    }
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                    aria-label={t('Select row')}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
                                                {serialNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="min-w-52 space-y-2">
                                                    <div className="font-semibold text-foreground">
                                                        {team.name}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                                                            <Trophy className="h-3.5 w-3.5" />
                                                            {team.sport?.name ??
                                                                ''}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            {selectedSession
                                                                ?.name ?? ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        team.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                    className={
                                                        team.is_active
                                                            ? 'border border-emerald-300 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                                                            : 'border border-amber-300 bg-amber-100/80 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
                                                    }
                                                >
                                                    {team.is_active
                                                        ? t('Active')
                                                        : t('Inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="min-w-44 space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                                        <div>
                                                            <div className="font-medium">
                                                                {postingPrimary(
                                                                    team,
                                                                ) ?? dash()}
                                                            </div>
                                                            {postingSecondary(
                                                                team,
                                                            ) && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {t(
                                                                        'District',
                                                                    )}
                                                                    :{' '}
                                                                    {postingSecondary(
                                                                        team,
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                    >
                                                        {team.location_type ===
                                                        'unit'
                                                            ? t('Unit')
                                                            : t('District')}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {visibleIncharge ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="h-auto justify-start rounded-lg px-2 py-1 text-left hover:bg-indigo-500/10"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setInchargeTeam(
                                                                team,
                                                            );
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <UserCheck className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                                                            <div>
                                                                <div className="font-medium">
                                                                    {
                                                                        visibleIncharge
                                                                    }
                                                                </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {assignedIncharge?.designation ??
                                                                    assignedIncharge?.rank ??
                                                                    t(
                                                                        'View incharge details',
                                                                    )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {inchargePno(team)
                                                                    ? `${t('PNO')}: ${inchargePno(
                                                                        team,
                                                                    )}`
                                                                    : ''}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {assignedIncharge?.email
                                                                    ? `${t('Email')}: ${assignedIncharge.email}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    </Button>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                                        {t('Unassigned')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex min-w-44 flex-wrap gap-1.5">
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-700 tabular-nums dark:text-slate-300">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {t('Total')}:{' '}
                                                        {team.players_count}
                                                    </span>
                                                    {team.removed_players_count >
                                                        0 && (
                                                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-300">
                                                            {t('Removed')}:{' '}
                                                            {
                                                                team.removed_players_count
                                                            }
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 tabular-nums dark:text-blue-300">
                                                        {t('Male')}:{' '}
                                                        {
                                                            team.male_players_count
                                                        }
                                                    </span>
                                                    <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-700 tabular-nums dark:text-rose-300">
                                                        {t('Female')}:{' '}
                                                        {
                                                            team.female_players_count
                                                        }
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex min-w-40 flex-wrap gap-1.5">
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-700 tabular-nums dark:text-violet-300">
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                        {t('Coaches')}:{' '}
                                                        {team.coaches_count}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-700 tabular-nums dark:text-orange-300">
                                                        {t('Captains')}:{' '}
                                                        {team.captains_count}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-md bg-teal-500/10 px-2 py-1 text-xs font-medium text-teal-700 tabular-nums dark:text-teal-300">
                                                        {t('Reserves')}:{' '}
                                                        {team.reserves_count}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="w-0">
                                                <div className="flex items-center justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t('Quick info')}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openQuickView(
                                                                team.id,
                                                            );
                                                        }}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={t('View')}
                                                        asChild
                                                    >
                                                        <Link
                                                            href={teamShowUrl(
                                                                team.id,
                                                            )}
                                                            onClick={(event) =>
                                                                event.stopPropagation()
                                                            }
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </div>

                {/* Pagination */}
                {teams.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                        <span>
                            {teams.from !== null
                                ? t('Showing :from–:to of :total')
                                      .replace(':from', String(teams.from))
                                      .replace(':to', String(teams.to ?? ''))
                                      .replace(':total', String(teams.total))
                                : ''}
                        </span>
                        <div className="flex items-center gap-1">
                            {teams.links.map((link, i) =>
                                link.url ? (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 min-w-8 px-2"
                                        onClick={() =>
                                            router.get(
                                                link.url!,
                                                {},
                                                { preserveState: true },
                                            )
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ) : (
                                    <Button
                                        key={i}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 min-w-8 px-2"
                                        disabled
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedIds={selectedIds}
                teams={teams}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                buildExportUrl={buildExportUrl}
                onPrint={handlePrint}
                t={t}
            />
            <InchargeDialog
                team={inchargeTeam}
                onClose={() => setInchargeTeam(null)}
                t={t}
            />
            <TeamQuickView
                teamId={quickViewId}
                open={quickViewId !== null}
                sessionId={quickViewSessionId}
                sessionName={quickViewSessionName}
                historical={quickViewHistoricalSession}
                onClose={() => {
                    setQuickViewId(null);
                    setQuickViewSessionId(null);
                    setQuickViewSessionName(null);
                    setQuickViewHistoricalSession(false);
                }}
            />
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [{ title: 'Teams', href: TeamController.index.url() }],
};

function InchargeDialog({
    team,
    onClose,
    t,
}: {
    team: Team | null;
    onClose: () => void;
    t: (key: string) => string;
}) {
    const assignment = team?.current_incharge_assignment ?? null;
    const displayName = assignment?.full_name ?? team?.in_charge ?? null;

    return (
        <Dialog
            open={team !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('In-charge details')}</DialogTitle>
                    <DialogDescription>
                        {team?.name ?? t('Team')}
                    </DialogDescription>
                </DialogHeader>

                {team && (
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-indigo-50/70 dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-semibold">
                                        {displayName ?? t('Unassigned')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {assignment?.designation ??
                                            assignment?.rank ??
                                            ''}
                                    </p>
                                </div>
                                <Badge className="bg-indigo-600 text-white">
                                    {assignment ? t('Current') : t('Legacy')}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-start gap-2 rounded-lg border p-3">
                                <IdCard className="mt-0.5 h-4 w-4 text-sky-600 dark:text-sky-300" />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('PNO')}
                                    </p>
                                    <p className="font-medium">
                                        {assignment?.pno ?? ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg border p-3">
                                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Rank')}
                                    </p>
                                    <p className="font-medium">
                                        {assignment?.rank ?? ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg border p-3">
                                <Phone className="mt-0.5 h-4 w-4 text-orange-600 dark:text-orange-300" />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Mobile')}
                                    </p>
                                    <p className="font-medium">
                                        {assignment?.mobile ?? ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg border p-3">
                                <Mail className="mt-0.5 h-4 w-4 text-rose-600 dark:text-rose-300" />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Email')}
                                    </p>
                                    <p className="font-medium break-all">
                                        {assignment?.email ?? ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2 rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('Assigned on')}
                                </span>
                                <span className="font-medium">
                                    {assignment?.assigned_at ?? ''}
                                </span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('Reason')}
                                </span>
                                <span className="text-right font-medium">
                                    {assignment?.assignment_reason ?? ''}
                                </span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-muted-foreground">
                                    {t('Remarks')}
                                </span>
                                <span className="text-right font-medium">
                                    {assignment?.remarks ?? ''}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t('Close')}
                    </Button>
                    {team && (
                        <Button asChild>
                            <Link href={TeamController.show.url(team.id)}>
                                <Eye className="mr-1.5 h-4 w-4" />
                                {t('Open team')}
                            </Link>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    selectedIds,
    teams,
    selectedColumns,
    setSelectedColumns,
    buildExportUrl,
    onPrint,
    t,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selectedIds: Set<number>;
    teams: PaginatedTeams;
    selectedColumns: string[];
    setSelectedColumns: Dispatch<SetStateAction<string[]>>;
    buildExportUrl: () => string;
    onPrint: () => void;
    t: (key: string) => string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Export teams')}</DialogTitle>
                    <DialogDescription>
                        {selectedIds.size > 0
                            ? t('Exporting :n selected teams.').replace(
                                  ':n',
                                  String(selectedIds.size),
                              )
                            : t('Exporting all :count teams.').replace(
                                  ':count',
                                  String(teams.total),
                              )}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
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
                        variant="outline"
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            onPrint();
                            onOpenChange(false);
                        }}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
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
