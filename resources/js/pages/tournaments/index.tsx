import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Download, Eye, Pencil, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState   } from 'react';
import type {Dispatch, SetStateAction} from 'react';
import { create as createTournament, edit as editTournament, index as tournamentsIndex, show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { index as exportTournamentsUrl } from '@/actions/App/Http/Controllers/TournamentExportController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
] as const;

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };

type Tournament = {
    id: number;
    name: string;
    date_from: string | null;
    venue: string | null;
    events_count: number;
    session: Session | null;
    tier: { id: number; code: string; label: string } | null;
    sport: Sport | null;
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

type Filters = { q?: string; session_id?: string; tier_id?: string; sport_id?: string };

export default function TournamentsIndex({
    tournaments,
    filters,
    sessions,
    sports,
    tiers,
}: {
    tournaments: PaginatedTournaments;
    filters: Filters;
    defaultSessionId: number | null;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

    setLayoutProps({
        breadcrumbs: [{ title: t('Tournaments') }],
    });

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

            router.get(tournamentsIndex.url(), clean, { preserveState: true, replace: true });
        },
        [query, filters.session_id, filters.tier_id, filters.sport_id],
    );

    useEffect(() => {
        if (debounceRef.current) {
clearTimeout(debounceRef.current);
}

        debounceRef.current = setTimeout(() => applyFilters({ q: query || undefined }), 400);

        return () => {
 if (debounceRef.current) {
clearTimeout(debounceRef.current);
}
};
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

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

    const hasActive = !!(filters.q || filters.session_id || filters.tier_id || filters.sport_id);

    return (
        <>
            <Head title={t('Tournaments')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading variant="small" title={t('Tournaments')} description={t('Manage tournaments')} />
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="mr-1.5 h-4 w-4" />
                            {selectedIds.size > 0
                                ? t('Export :n selected').replace(':n', String(selectedIds.size))
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
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search tournaments…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select
                        value={filters.session_id ?? 'all'}
                        onValueChange={(v) => applyFilters({ session_id: v === 'all' ? undefined : v })}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sessions')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All sessions')}</SelectItem>
                            {sessions.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.tier_id ?? 'all'}
                        onValueChange={(v) => applyFilters({ tier_id: v === 'all' ? undefined : v })}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('All tiers')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All tiers')}</SelectItem>
                            {tiers.map((tier) => (
                                <SelectItem key={tier.id} value={String(tier.id)}>{tier.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.sport_id ?? 'all'}
                        onValueChange={(v) => applyFilters({ sport_id: v === 'all' ? undefined : v })}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sports')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All sports')}</SelectItem>
                            {sports.map((sp) => (
                                <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {hasActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                router.get(tournamentsIndex.url(), {}, { preserveState: false, replace: true });
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
                                            tournaments.data.length > 0 && tournaments.data.every((t_) => selectedIds.has(t_.id))
                                                ? true
                                                : tournaments.data.some((t_) => selectedIds.has(t_.id))
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={togglePage}
                                        aria-label={t('Select all on page')}
                                    />
                                </TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Session')}</TableHead>
                                <TableHead>{t('Tier')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Date from')}</TableHead>
                                <TableHead className="text-right">{t('Events')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tournaments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                        {hasActive ? t('No tournaments match your filters.') : t('No tournaments yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tournaments.data.map((t_) => (
                                    <TableRow key={t_.id}>
                                        <TableCell className="w-0">
                                            <Checkbox
                                                checked={selectedIds.has(t_.id)}
                                                onCheckedChange={() => toggleRow(t_.id)}
                                                aria-label={t('Select row')}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{t_.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{t_.session?.name ?? '—'}</TableCell>
                                        <TableCell>
                                            {t_.tier ? (
                                                <Badge variant="secondary">{t_.tier.label}</Badge>
                                            ) : (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{t_.sport?.name ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{t_.date_from ?? '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums">{t_.events_count}</TableCell>
                                        <TableCell className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" title={t('View')} asChild>
                                                <Link href={showTournament.url(t_.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" title={t('Edit')} asChild>
                                                <Link href={editTournament.url(t_.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {tournaments.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            {t('Showing :from–:to of :total')
                                .replace(':from', String(tournaments.from ?? 0))
                                .replace(':to', String(tournaments.to ?? 0))
                                .replace(':total', String(tournaments.total))}
                        </span>
                        <div className="flex gap-1">
                            {tournaments.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
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
        </>
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
                            ? t('Exporting :n selected tournaments.').replace(':n', String(selectedIds.size))
                            : t('Exporting all :count tournaments.').replace(':count', String(tournaments.total))}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <p className="mb-3 text-sm font-medium">{t('Select columns to export')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {ALL_COLUMNS.map((col) => (
                            <div key={col.key} className="flex items-center gap-2">
                                <Checkbox
                                    id={`col-${col.key}`}
                                    checked={selectedColumns.includes(col.key)}
                                    onCheckedChange={(checked) =>
                                        setSelectedColumns((prev) =>
                                            checked
                                                ? [...prev, col.key]
                                                : prev.filter((k) => k !== col.key),
                                        )
                                    }
                                />
                                <Label htmlFor={`col-${col.key}`}>{t(col.label)}</Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
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
