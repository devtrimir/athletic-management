import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

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

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const current: Filters = {
                q: query || undefined,
                session_id: filters.session_id,
                sport_id: filters.sport_id,
                unit_id: filters.unit_id,
            };
            const merged: Filters = { ...current, ...patch };

            const clean: Record<string, string> = {};

            if (merged.q) {
                clean['filter[q]'] = merged.q;
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
        [query, filters.session_id, filters.sport_id, filters.unit_id],
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

    const hasActiveFilters = !!(
        filters.q ||
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
                    <Button asChild size="sm">
                        <Link href={TeamController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New team')}
                        </Link>
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search teams…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select
                        value={filters.session_id ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({ session_id: v === 'all' ? undefined : v })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sessions')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All sessions')}</SelectItem>
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
                            applyFilters({ sport_id: v === 'all' ? undefined : v })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All sports')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All sports')}</SelectItem>
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
                            applyFilters({ unit_id: v === 'all' ? undefined : v })
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All units')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All units')}</SelectItem>
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
                                router.get(TeamController.index.url(), {}, {
                                    preserveState: false,
                                    replace: true,
                                });
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
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Session')}</TableHead>
                                <TableHead>{t('Unit')}</TableHead>
                                <TableHead>{t('In-charge')}</TableHead>
                                <TableHead className="text-right">{t('Players')}</TableHead>
                                <TableHead className="text-right">{t('Coaches')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
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
                                        <TableCell className="font-medium">
                                            {team.name_hi}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.sport?.name ?? (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.session?.name ?? (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.unit?.name_hi ?? (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {team.in_charge_hi ?? (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {team.players_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {team.coaches_count}
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={t('View')}
                                                asChild
                                            >
                                                <Link href={TeamController.show.url(team.id)}>
                                                    <Eye className="h-4 w-4" />
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
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 min-w-8 px-2"
                                        onClick={() =>
                                            router.get(link.url!, {}, { preserveState: true })
                                        }
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <Button
                                        key={i}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 min-w-8 px-2"
                                        disabled
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [{ title: 'Teams', href: TeamController.index.url() }],
};
