import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Eye, Pencil, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { create as createTournament, edit as editTournament, index as tournamentsIndex, show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };

type Tournament = {
    id: number;
    name_hi: string;
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

    const hasActive = !!(filters.q || filters.session_id || filters.tier_id || filters.sport_id);

    return (
        <>
            <Head title={t('Tournaments')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading variant="small" title={t('Tournaments')} description={t('Manage tournaments')} />
                    <Button asChild size="sm">
                        <Link href={createTournament.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New tournament')}
                        </Link>
                    </Button>
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
                                <TableHead>{t('Name (Hindi)')}</TableHead>
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
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                        {hasActive ? t('No tournaments match your filters.') : t('No tournaments yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tournaments.data.map((t_) => (
                                    <TableRow key={t_.id}>
                                        <TableCell className="font-medium">{t_.name_hi}</TableCell>
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
        </>
    );
}

