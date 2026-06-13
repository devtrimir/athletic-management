import { Head, Link, router } from '@inertiajs/react';
import { Download, Eye, Info, Plus, Printer, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamsUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import Heading from '@/components/heading';
import { TeamQuickView } from '@/components/teams/team-quick-view';
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
    { key: 'name_hi', label: 'Team Name (Hindi)' },
    { key: 'session', label: 'Session' },
    { key: 'sport', label: 'Sport' },
    { key: 'unit', label: 'Unit' },
    { key: 'in_charge_hi', label: 'In-Charge' },
    { key: 'players_count', label: 'Players' },
    { key: 'captains_count', label: 'Captains' },
    { key: 'reserves_count', label: 'Reserves' },
    { key: 'coaches_count', label: 'Coaches' },
] as const;

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Team = {
    id: number;
    name_hi: string;
    in_charge_hi: string | null;
    players_count: number;
    captains_count: number;
    reserves_count: number;
    coaches_count: number;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    unit: { id: number; name_hi: string } | null;
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
    unit_id?: string;
};

type RefItem = { id: number; name: string };
type UnitItem = { id: number; name_hi: string };

export default function TeamsIndex({
    teams,
    filters,
    sessions,
    sports,
    units,
}: {
    teams: PaginatedTeams;
    filters: Filters;
    sessions: RefItem[];
    sports: RefItem[];
    units: UnitItem[];
}) {
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [quickViewId, setQuickViewId] = useState<number | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );

    const [query, setQuery] = useState(filters.q ?? '');
    const [pnoQuery, setPnoQuery] = useState(filters.pno ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pnoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const current: Filters = {
                q: query || undefined,
                pno: pnoQuery || undefined,
                session_id: filters.session_id,
                sport_id: filters.sport_id,
                unit_id: filters.unit_id,
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

            router.get(TeamController.index.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [
            query,
            pnoQuery,
            filters.session_id,
            filters.sport_id,
            filters.unit_id,
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

            if (filters.unit_id) {
                params.append('filter[unit_id]', filters.unit_id);
            }
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportTeamsUrl.url() + '?' + params.toString();
    }

    function handlePrint() {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const headers = cols.map((c) => `<th>${t(c.label)}</th>`).join('');
        const bodyRows = teams.data
            .map(
                (team) =>
                    `<tr>${cols
                        .map((c) => {
                            let v: string;

                            if (c.key === 'session') {
                                v = team.session?.name ?? '\u2014';
                            } else if (c.key === 'sport') {
                                v = team.sport?.name ?? '\u2014';
                            } else if (c.key === 'unit') {
                                v = team.unit?.name_hi ?? '\u2014';
                            } else {
                                const raw = (team as Record<string, unknown>)[
                                    c.key
                                ];
                                v =
                                    raw != null && raw !== ''
                                        ? String(raw)
                                        : '\u2014';
                            }

                            return `<td>${v}</td>`;
                        })
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
        filters.session_id ||
        filters.sport_id ||
        filters.unit_id
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

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3">
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
                        value={filters.session_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                session_id: v === 'all' ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sessions')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All sessions')}
                            </SelectItem>
                            {sessions.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

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
                                    {u.name_hi}
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
                <div className="overflow-hidden rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                                <TableHead>{t('Name (Hindi)')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Session')}</TableHead>
                                <TableHead>{t('Unit')}</TableHead>
                                <TableHead>{t('In-charge')}</TableHead>
                                <TableHead>{t('Roster')}</TableHead>
                                <TableHead className="w-0 text-right">
                                    {t('Actions')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teams.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        {hasActiveFilters
                                            ? t('No teams match your filters.')
                                            : t('No teams yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teams.data.map((team) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="w-0">
                                            <Checkbox
                                                checked={selectedIds.has(
                                                    team.id,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleRow(team.id)
                                                }
                                                aria-label={t('Select row')}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {team.name_hi}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.sport?.name ?? (
                                                <span className="text-border select-none">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.session?.name ?? (
                                                <span className="text-border select-none">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.unit?.name_hi ?? (
                                                <span className="text-border select-none">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.in_charge_hi ?? (
                                                <span className="text-border select-none">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                                                    {t('Players')}:{' '}
                                                    {team.players_count}
                                                </span>
                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                                                    {t('Captains')}:{' '}
                                                    {team.captains_count}
                                                </span>
                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                                                    {t('Reserves')}:{' '}
                                                    {team.reserves_count}
                                                </span>
                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                                                    {t('Coaches')}:{' '}
                                                    {team.coaches_count}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Quick info')}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setQuickViewId(team.id);
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
                                                        href={TeamController.show.url(
                                                            team.id,
                                                        )}
                                                    >
                                                        <Eye className="h-4 w-4" />
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
            <TeamQuickView
                teamId={quickViewId}
                open={quickViewId !== null}
                onClose={() => setQuickViewId(null)}
            />
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [{ title: 'Teams', href: TeamController.index.url() }],
};

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
