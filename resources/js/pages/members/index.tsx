import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Search, X } from 'lucide-react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
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

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    current_unit: { id: number; name_hi: string } | null;
};

type PaginatedMembers = {
    data: Member[];
    links: PaginationLink[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

type Filters = {
    q?: string;
    current_status?: string;
    player_category?: string;
};

const STATUS_OPTIONS = ['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'] as const;
const CATEGORY_OPTIONS = ['GD', 'SKILLED'] as const;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'secondary',
    RETIRED: 'secondary',
};

export default function MembersIndex({
    members,
    filters,
}: {
    members: PaginatedMembers;
    filters: Filters;
}) {
    const { t } = useTranslation();

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback((patch: Partial<Filters>) => {
        const current: Filters = {
            q: query || undefined,
            current_status: filters.current_status,
            player_category: filters.player_category,
        };
        const merged: Filters = { ...current, ...patch };

        // Remove empty values so URL stays clean
        const clean: Record<string, string> = {};
        if (merged.q) { clean['filter[q]'] = merged.q; }
        if (merged.current_status) { clean['filter[current_status]'] = merged.current_status; }
        if (merged.player_category) { clean['filter[player_category]'] = merged.player_category; }

        router.get(MemberController.index.url(), clean, {
            preserveState: true,
            replace: true,
        });
    }, [query, filters.current_status, filters.player_category]);

    // Debounce text search
    useEffect(() => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); }
        debounceRef.current = setTimeout(() => {
            applyFilters({ q: query || undefined });
        }, 400);
        return () => { if (debounceRef.current) { clearTimeout(debounceRef.current); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const hasActiveFilters = !!(filters.q || filters.current_status || filters.player_category);

    return (
        <>
            <Head title={t('Members')} />

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Members')}
                        description={t('Manage athlete roster')}
                    />
                    <Button asChild size="sm">
                        <Link href={MemberController.create.url()}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('New member')}
                        </Link>
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search members…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select
                        value={filters.current_status ?? 'all'}
                        onValueChange={(v) => applyFilters({ current_status: v === 'all' ? undefined : v })}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('All statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All statuses')}</SelectItem>
                            {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.player_category ?? 'all'}
                        onValueChange={(v) => applyFilters({ player_category: v === 'all' ? undefined : v })}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder={t('All categories')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All categories')}</SelectItem>
                            {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c} value={c}>{t(c)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                router.get(MemberController.index.url(), {}, { preserveState: false, replace: true });
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
                                <TableHead>{t('Code')}</TableHead>
                                <TableHead>{t('Name (Hindi)')}</TableHead>
                                <TableHead>{t('PNO')}</TableHead>
                                <TableHead>{t('Category')}</TableHead>
                                <TableHead>{t('Level')}</TableHead>
                                <TableHead>{t('Unit')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                        {hasActiveFilters
                                            ? t('No members match your filters.')
                                            : t('No members yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.data.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {member.member_code}
                                        </TableCell>
                                        <TableCell className="font-medium">{member.full_name_hi}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {member.pno ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t(member.player_category)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{t(member.player_level)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {member.current_unit?.name_hi ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[member.current_status] ?? 'outline'}>
                                                {t(member.current_status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-0">
                                            <Button variant="ghost" size="icon" title={t('View')} asChild>
                                                <Link href={MemberController.show.url(member.id)}>
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
                {members.meta.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                        <span>
                            {members.meta.from !== null
                                ? t('Showing :from–:to of :total')
                                    .replace(':from', String(members.meta.from))
                                    .replace(':to', String(members.meta.to ?? ''))
                                    .replace(':total', String(members.meta.total))
                                : ''}
                        </span>
                        <div className="flex items-center gap-1">
                            {members.links.map((link, i) => (
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
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

MembersIndex.layout = {
    breadcrumbs: [
        { title: 'Members', href: MemberController.index.url() },
    ],
};

