import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
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

type LinkedMember = {
    id: number;
    member_code: string;
    full_name_hi: string;
    pno: string | null;
    rank: string | null;
};

type Coach = {
    id: number;
    full_name_hi: string;
    full_name_en: string | null;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    member: LinkedMember | null;
};

type PaginatedCoaches = {
    data: Coach[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    q?: string;
    has_member?: string;
    nis_certified?: string;
};

export default function CoachesIndex({
    coaches,
    filters,
}: {
    coaches: PaginatedCoaches;
    filters: Filters;
}) {
    const { t } = useTranslation();

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const current: Filters = {
                q: query || undefined,
                has_member: filters.has_member,
                nis_certified: filters.nis_certified,
            };
            const merged: Filters = { ...current, ...patch };

            const clean: Record<string, string> = {};

            if (merged.q) {
clean['filter[q]'] = merged.q;
}

            if (merged.has_member) {
clean['filter[has_member]'] = merged.has_member;
}

            if (merged.nis_certified) {
clean['filter[nis_certified]'] = merged.nis_certified;
}

            router.get(CoachController.index.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [query, filters.has_member, filters.nis_certified],
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

    const hasActiveFilters = !!(filters.q || filters.has_member || filters.nis_certified);

    return (
        <>
            <Head title={t('Coaches')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Coaches')}
                        description={t('Manage coaching staff')}
                    />
                    <Button asChild size="sm">
                        <Link href={CoachController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New coach')}
                        </Link>
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search coaches…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select
                        value={filters.has_member ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({ has_member: v === 'all' ? undefined : v })
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('All coaches')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All coaches')}</SelectItem>
                            <SelectItem value="true">{t('Linked to member')}</SelectItem>
                            <SelectItem value="false">{t('Standalone')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.nis_certified ?? 'all'}
                        onValueChange={(v) =>
                            applyFilters({ nis_certified: v === 'all' ? undefined : v })
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t('All NIS')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All NIS')}</SelectItem>
                            <SelectItem value="1">{t('NIS certified')}</SelectItem>
                            <SelectItem value="0">{t('Not NIS certified')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                router.get(CoachController.index.url(), {}, { preserveState: false, replace: true });
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
                                <TableHead>{t('PNO')}</TableHead>
                                <TableHead>{t('NIS')}</TableHead>
                                <TableHead>{t('Linked member')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coaches.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                                        {hasActiveFilters
                                            ? t('No coaches match your filters.')
                                            : t('No coaches yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coaches.data.map((coach) => (
                                    <TableRow key={coach.id}>
                                        <TableCell className="font-medium">{coach.full_name_hi}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {coach.pno ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            {coach.nis_certified ? (
                                                <Badge variant="default">{t('NIS')}</Badge>
                                            ) : (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {coach.member ? (
                                                <span className="font-mono text-xs">
                                                    {coach.member.member_code}
                                                    {' · '}
                                                    {coach.member.full_name_hi}
                                                </span>
                                            ) : (
                                                <span className="select-none text-border">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <Button variant="ghost" size="icon" title={t('View')} asChild>
                                                <Link href={CoachController.show.url(coach.id)}>
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
                {coaches.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                        <span>
                            {coaches.from !== null
                                ? t('Showing :from–:to of :total')
                                    .replace(':from', String(coaches.from))
                                    .replace(':to', String(coaches.to ?? ''))
                                    .replace(':total', String(coaches.total))
                                : ''}
                        </span>
                        <div className="flex items-center gap-1">
                            {coaches.links.map((link, i) =>
                                link.url ? (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 min-w-8 px-2"
                                        onClick={() => router.get(link.url!, {}, { preserveState: true })}
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

CoachesIndex.layout = {
    breadcrumbs: [{ title: 'Coaches', href: CoachController.index.url() }],
};
