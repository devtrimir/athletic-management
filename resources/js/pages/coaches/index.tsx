import { Head, Link, router } from '@inertiajs/react';
import { Download, Eye, Info, Plus, Printer, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState   } from 'react';
import type {Dispatch, SetStateAction} from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import Heading from '@/components/heading';
import { CoachQuickView } from '@/components/teams/coach-quick-view';
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
    { key: 'pno', label: 'PNO' },
    { key: 'full_name_hi', label: 'Name (Hindi)' },
    { key: 'full_name_en', label: 'Name (English)' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'nis_certified', label: 'NIS Certified' },
    { key: 'linked_member', label: 'Linked Member Code' },
] as const;

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

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
    const [quickViewId, setQuickViewId] = useState<number | null>(null);

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
        const pageIds = coaches.data.map((c) => c.id);
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

            if (filters.has_member) {
params.append('filter[has_member]', filters.has_member);
}

            if (filters.nis_certified) {
params.append('filter[nis_certified]', filters.nis_certified);
}
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportCoachesUrl.url() + '?' + params.toString();
    }

    function handlePrint() {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const headers = cols.map((c) => `<th>${t(c.label)}</th>`).join('');
        const bodyRows = coaches.data
            .map(
                (coach) =>
                    `<tr>${cols
                        .map((c) => {
                            let v: string;

                            if (c.key === 'nis_certified') {
v = coach.nis_certified ? t('NIS Certified') : t('Not NIS Certified');
} else if (c.key === 'linked_member') {
v = coach.member?.member_code ?? '\u2014';
} else {
                                const raw = (coach as Record<string, unknown>)[c.key];
                                v = raw != null && raw !== '' ? String(raw) : '\u2014';
                            }

                            return `<td>${v}</td>`;
                        })
                        .join('')}</tr>`,
            )
            .join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Coaches')}</title><style>body{font-family:sans-serif;font-size:12px;padding:16px}h2{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Coaches')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
return;
}

        win.document.write(html);
        win.document.close();
    }

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
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="mr-1.5 h-4 w-4" />
                            {selectedIds.size > 0
                                ? t('Export :n selected').replace(':n', String(selectedIds.size))
                                : t('Export coaches')}
                        </Button>
                        <Button asChild size="sm">
                            <Link href={CoachController.create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New coach')}
                            </Link>
                        </Button>
                    </div>
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
                                <TableHead className="w-0">
                                    <Checkbox
                                        checked={
                                            coaches.data.length > 0 && coaches.data.every((c) => selectedIds.has(c.id))
                                                ? true
                                                : coaches.data.some((c) => selectedIds.has(c.id))
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={togglePage}
                                        aria-label={t('Select all on page')}
                                    />
                                </TableHead>
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
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                        {hasActiveFilters
                                            ? t('No coaches match your filters.')
                                            : t('No coaches yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coaches.data.map((coach) => (
                                    <TableRow key={coach.id}>
                                        <TableCell className="w-0">
                                            <Checkbox
                                                checked={selectedIds.has(coach.id)}
                                                onCheckedChange={() => toggleRow(coach.id)}
                                                aria-label={t('Select row')}
                                            />
                                        </TableCell>
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
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Quick info')}
                                                    onClick={(e) => {
 e.stopPropagation(); setQuickViewId(coach.id);
}}
                                                >
                                                    <Info className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title={t('View')} asChild>
                                                    <Link href={CoachController.show.url(coach.id)}>
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

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedIds={selectedIds}
                coaches={coaches}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                buildExportUrl={buildExportUrl}
                onPrint={handlePrint}
                t={t}
            />

            <CoachQuickView
                coachId={quickViewId}
                open={quickViewId !== null}
                onClose={() => setQuickViewId(null)}
            />
        </>
    );
}

CoachesIndex.layout = {
    breadcrumbs: [{ title: 'Coaches', href: CoachController.index.url() }],
};

function ExportDialog({
    open,
    onOpenChange,
    selectedIds,
    coaches,
    selectedColumns,
    setSelectedColumns,
    buildExportUrl,
    onPrint,
    t,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selectedIds: Set<number>;
    coaches: PaginatedCoaches;
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
                    <DialogTitle>{t('Export coaches')}</DialogTitle>
                    <DialogDescription>
                        {selectedIds.size > 0
                            ? t('Exporting :n selected coaches.').replace(':n', String(selectedIds.size))
                            : t('Exporting all :count coaches.').replace(':count', String(coaches.total))}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
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
