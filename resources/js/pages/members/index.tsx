import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronDown, Download, Eye, Info, Plus, Printer, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { index as exportMembersUrl } from '@/actions/App/Http/Controllers/MemberExportController';
import Heading from '@/components/heading';
import { MemberQuickView } from '@/components/members/member-quick-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    full_name: string;
    rank: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    home_district: { id: number; name: string } | null;
    current_unit: { id: number; name: string } | null;
    posting_district: { id: number; name: string } | null;
    playable_sports: Array<SportOption & {
        pivot?: {
            role?: string | null;
            position?: string | null;
            notes?: string | null;
        };
        role?: string | null;
        position?: string | null;
        notes?: string | null;
    }>;
};

type UnitOption = { id: number; name: string };
type DistrictOption = { id: number; name: string };
type SportOption = { id: number; name: string };
type MasterOption = { code: string; name: string; short_name: string | null };

type PaginatedMembers = {
    data: Member[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    q?: string;
    current_status?: string;
    player_category?: string;
    player_level?: string;
    rank?: string;
    designation?: string;
    current_unit_id?: string;
    home_district_id?: string;
    posting_district_id?: string;
    gender?: string;
    blood_group?: string;
    sport_id?: string;
    joining_year_from?: string;
    joining_year_to?: string;
};

const ALL_COLUMNS: { key: string; label: string }[] = [
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'father_name', label: "Father's name" },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'rank', label: 'Rank' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'current_status', label: 'Status' },
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'unit', label: 'Unit' },
    { key: 'home_district', label: 'Home district' },
    { key: 'posting_district', label: 'Posting unit / district' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'designation', label: 'Designation' },
    { key: 'appointment', label: 'Appointment' },
    { key: 'playable_sports', label: 'Playable sports' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

const STATUS_OPTIONS = ['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'] as const;
const CATEGORY_OPTIONS = ['GD', 'SPORTS_QUOTA'] as const;
const LEVEL_OPTIONS = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'] as const;
const GENDER_OPTIONS: { value: string; label: string }[] = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other gender' },
];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'secondary',
    RETIRED: 'secondary',
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
    GD: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    SPORTS_QUOTA: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
};

const LEVEL_BADGE_CLASS: Record<string, string> = {
    ZONAL: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
    AIPSC: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
    NATIONAL: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    INTERNATIONAL: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
};

function displayCategory(category: string): string {
    return category === 'SKILLED' ? 'SPORTS_QUOTA' : category;
}

function localeName(entity: { name: string }, locale: string): string {
    return locale === 'en' ? entity.name : (entity.name ?? entity.name);
}

function postingLocation(member: Member): string | null {
    return member.posting_district?.name ?? member.current_unit?.name ?? null;
}

function sportSummary(sport: Member['playable_sports'][number]): string {
    return [sport.name, sport.role ?? sport.pivot?.role, sport.position ?? sport.pivot?.position, sport.notes ?? sport.pivot?.notes]
        .filter(Boolean)
        .join(' · ');
}

function parseDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string | null | undefined, locale: string): string | null {
    if (!value) {
        return null;
    }

    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        dateStyle: 'medium',
    }).format(date);
}

function SportCell({ member }: { member: Member }) {
    const { t } = useTranslation();
    const playableSports = member.playable_sports;

    if (playableSports.length === 0) {
        return <span className="select-none text-border">—</span>;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex max-w-44 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="truncate">{sportSummary(playableSports[0])}</span>
                    {playableSports.length > 1 && (
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                            +{playableSports.length - 1}
                        </Badge>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('Sports')}</p>
                        <ul className="mt-1 space-y-2 text-sm">
                            {playableSports.map((sport) => (
                                <li key={sport.id} className="space-y-0.5">
                                    <p className="font-medium">{sport.name}</p>
                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                        {(sport.role ?? sport.pivot?.role) && (
                                            <p>
                                                <span className="font-medium text-foreground">{t('Role / position')}:</span>{' '}
                                                {sport.role ?? sport.pivot?.role}
                                            </p>
                                        )}
                                        {(sport.notes ?? sport.pivot?.notes) && (
                                            <p>
                                                <span className="font-medium text-foreground">{t('Notes')}:</span>{' '}
                                                {sport.notes ?? sport.pivot?.notes}
                                            </p>
                                        )}
                                        {!sport.role && !sport.pivot?.role && !sport.position && !sport.pivot?.position && !sport.notes && !sport.pivot?.notes && <p>—</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
    label,
    activeLabel,
    onClear,
    children,
}: {
    label: string;
    activeLabel?: string;
    onClear: () => void;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const isActive = !!activeLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={[
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                        isActive
                            ? 'border-primary/40 bg-primary/8 text-primary hover:bg-primary/12'
                            : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')}
                >
                    <span>{label}</span>
                    {isActive && (
                        <>
                            <span className="text-primary/50">·</span>
                            <span className="max-w-24 truncate font-semibold">{activeLabel}</span>
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Clear ${label}`}
                                className="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                    setOpen(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        onClear();
                                        setOpen(false);
                                    }
                                }}
                            >
                                <X className="size-3" />
                            </span>
                        </>
                    )}
                    {!isActive && <ChevronDown className="size-3 opacity-50" />}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                {children}
            </PopoverContent>
        </Popover>
    );
}

function OptionList({
    options,
    value,
    onSelect,
}: {
    options: { value: string; label: string }[];
    value: string | undefined;
    onSelect: (v: string | undefined) => void;
}) {
    return (
        <div className="py-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() => onSelect(value === opt.value ? undefined : opt.value)}
                >
                    <Check className={['size-3.5 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0'].join(' ')} />
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function SearchableOptionList({
    options,
    value,
    onSelect,
    searchPlaceholder,
}: {
    options: { value: string; label: string }[];
    value: string | undefined;
    onSelect: (v: string | undefined) => void;
    searchPlaceholder: string;
}) {
    return (
        <Command className="w-56">
            <CommandInput placeholder={searchPlaceholder} className="h-8 text-sm" />
            <CommandList className="max-h-52">
                <CommandEmpty>—</CommandEmpty>
                <CommandGroup>
                    {options.map((opt) => (
                        <CommandItem
                            key={opt.value}
                            value={opt.label}
                            onSelect={() => onSelect(value === opt.value ? undefined : opt.value)}
                            className="gap-2"
                        >
                            <Check className={['size-3.5 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0'].join(' ')} />
                            {opt.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export default function MembersIndex({
    members,
    filters,
    units,
    districts,
    sports,
    ranks,
    designations,
    totalCount,
    perPage,
}: {
    members: PaginatedMembers;
    filters: Filters;
    units: UnitOption[];
    districts: DistrictOption[];
    sports: SportOption[];
    ranks: MasterOption[];
    designations: MasterOption[];
    totalCount: number;
    perPage: number;
}) {
    const { t } = useTranslation();
    const { locale } = usePage().props;

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
    const [quickViewId, setQuickViewId] = useState<number | null>(null);

    // Row selection — persists across pagination pages
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Local draft for joining year (applied on blur/enter only to avoid spamming requests)
    const [yearFrom, setYearFrom] = useState(filters.joining_year_from ?? '');
    const [yearTo, setYearTo] = useState(filters.joining_year_to ?? '');

    const applyFilters = useCallback((patch: Partial<Filters>) => {
        const merged: Filters = {
            q: query || undefined,
            current_status: filters.current_status,
            player_category: filters.player_category,
            player_level: filters.player_level,
            rank: filters.rank,
            designation: filters.designation,
            current_unit_id: filters.current_unit_id,
            home_district_id: filters.home_district_id,
            posting_district_id: filters.posting_district_id,
            gender: filters.gender,
            blood_group: filters.blood_group,
            sport_id: filters.sport_id,
            joining_year_from: filters.joining_year_from,
            joining_year_to: filters.joining_year_to,
            ...patch,
        };

        const clean: Record<string, string> = {};
        const mapping: [keyof Filters, string][] = [
            ['q', 'filter[q]'],
            ['current_status', 'filter[current_status]'],
            ['player_category', 'filter[player_category]'],
            ['player_level', 'filter[player_level]'],
            ['rank', 'filter[rank]'],
            ['designation', 'filter[designation]'],
            ['current_unit_id', 'filter[current_unit_id]'],
            ['home_district_id', 'filter[home_district_id]'],
            ['posting_district_id', 'filter[posting_district_id]'],
            ['gender', 'filter[gender]'],
            ['blood_group', 'filter[blood_group]'],
            ['sport_id', 'filter[sport_id]'],
            ['joining_year_from', 'filter[joining_year_from]'],
            ['joining_year_to', 'filter[joining_year_to]'],
        ];

        for (const [k, param] of mapping) {
            if (merged[k]) {
                clean[param] = merged[k]!;
            }
        }

        if (perPage !== 25) {
            clean['per_page'] = String(perPage);
        }

        router.get(MemberController.index.url(), clean, { preserveState: true, replace: true });
    }, [query, filters, perPage]);

    // Debounce text search
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

    const activeFilterCount = [
        filters.current_status, filters.player_category, filters.player_level,
        filters.rank, filters.designation, filters.current_unit_id, filters.home_district_id, filters.posting_district_id, filters.gender,
        filters.blood_group, filters.sport_id,
        filters.joining_year_from, filters.joining_year_to,
    ].filter(Boolean).length;
    const hasAnyFilter = !!(filters.q) || activeFilterCount > 0;

    function clearAll() {
        setQuery('');
        setYearFrom('');
        setYearTo('');
        router.get(MemberController.index.url(), {}, { preserveState: false, replace: true });
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        if (selectedIds.size > 0) {
            // Export only the selected rows by ID
            for (const id of selectedIds) {
                params.append('ids[]', String(id));
            }
        } else {
            // Export filtered results
            const filterKeys: [keyof Filters, string][] = [
                ['q', 'filter[q]'],
                ['current_status', 'filter[current_status]'],
                ['player_category', 'filter[player_category]'],
                ['player_level', 'filter[player_level]'],
                ['rank', 'filter[rank]'],
                ['designation', 'filter[designation]'],
                ['current_unit_id', 'filter[current_unit_id]'],
                ['home_district_id', 'filter[home_district_id]'],
                ['posting_district_id', 'filter[posting_district_id]'],
                ['gender', 'filter[gender]'],
                ['blood_group', 'filter[blood_group]'],
                ['sport_id', 'filter[sport_id]'],
                ['joining_year_from', 'filter[joining_year_from]'],
                ['joining_year_to', 'filter[joining_year_to]'],
            ];

            for (const [k, param] of filterKeys) {
                if (filters[k]) {
params.append(param, filters[k]!);
}
            }
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportMembersUrl.url() + '?' + params.toString();
    }

    function handlePrint() {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const headers = cols.map((c) => `<th>${t(c.label)}</th>`).join('');
        const bodyRows = members.data
            .map(
                (m) =>
                    `<tr>${cols
                        .map((c) => {
                            if (c.key === 'unit') {
return `<td>${m.current_unit?.name ?? '\u2014'}</td>`;
}

                            if (c.key === 'home_district') {
return `<td>${m.home_district?.name ?? '\u2014'}</td>`;
}

                            if (c.key === 'posting_district') {
return `<td>${m.posting_district?.name ?? m.current_unit?.name ?? '\u2014'}</td>`;
                            }

                            if (['dob', 'joining_date', 'promotion_date', 'team_since'].includes(c.key)) {
                                const value = (m as Record<string, unknown>)[c.key];

                                return `<td>${typeof value === 'string' ? (formatDisplayDate(value, locale) ?? '\u2014') : '\u2014'}</td>`;
                            }

                            const v = (m as Record<string, unknown>)[c.key];

                            return `<td>${v != null && v !== '' ? String(v) : '\u2014'}</td>`;
                        })
                        .join('')}</tr>`,
            )
            .join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Members')}</title><style>body{font-family:sans-serif;font-size:10px;line-height:1.3;padding:12px}h2{font-size:13px;margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 6px;text-align:left;vertical-align:top}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Members')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
return;
}

        win.document.write(html);
        win.document.close();
    }

    const pageIds = members.data.map((m) => m.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const somePageSelected = pageIds.some((id) => selectedIds.has(id));

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
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (allPageSelected) {
                pageIds.forEach((id) => next.delete(id));
            } else {
                pageIds.forEach((id) => next.add(id));
            }

            return next;
        });
    }

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
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="mr-1.5 h-4 w-4" />
                            {selectedIds.size > 0
                                ? t('Export :n selected').replace(':n', String(selectedIds.size))
                                : t('Export')}
                        </Button>
                        <Button asChild size="sm">
                            <Link href={MemberController.create.url()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New member')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filter bar — inline pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-56 shrink-0">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search members…')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-8 pl-8 text-sm"
                        />
                    </div>

                    {/* Status */}
                    <FilterPill
                        label={t('Status')}
                        activeLabel={filters.current_status ? t(filters.current_status) : undefined}
                        onClear={() => applyFilters({ current_status: undefined })}
                    >
                        <OptionList
                            options={STATUS_OPTIONS.map((s) => ({ value: s, label: t(s) }))}
                            value={filters.current_status}
                            onSelect={(v) => applyFilters({ current_status: v })}
                        />
                    </FilterPill>

                    {/* Category */}
                    <FilterPill
                        label={t('Category')}
                        activeLabel={filters.player_category ? t(filters.player_category) : undefined}
                        onClear={() => applyFilters({ player_category: undefined })}
                    >
                        <OptionList
                            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
                            value={filters.player_category}
                            onSelect={(v) => applyFilters({ player_category: v })}
                        />
                    </FilterPill>

                    {/* Level */}
                    <FilterPill
                        label={t('Level')}
                        activeLabel={filters.player_level ? t(filters.player_level) : undefined}
                        onClear={() => applyFilters({ player_level: undefined })}
                    >
                        <OptionList
                            options={LEVEL_OPTIONS.map((l) => ({ value: l, label: t(l) }))}
                            value={filters.player_level}
                            onSelect={(v) => applyFilters({ player_level: v })}
                        />
                    </FilterPill>

                    <FilterPill
                        label={t('Rank')}
                        activeLabel={filters.rank ? (ranks.find((rank) => rank.code === filters.rank)?.name ?? filters.rank) : undefined}
                        onClear={() => applyFilters({ rank: undefined })}
                    >
                        <SearchableOptionList
                            options={ranks.map((rank) => ({
                                value: rank.code,
                                label: rank.name ?? rank.code,
                            }))}
                            value={filters.rank}
                            onSelect={(v) => applyFilters({ rank: v })}
                            searchPlaceholder={t('Search ranks…')}
                        />
                    </FilterPill>

                    <FilterPill
                        label={t('Designation')}
                        activeLabel={filters.designation ? (designations.find((designation) => designation.code === filters.designation)?.name ?? filters.designation) : undefined}
                        onClear={() => applyFilters({ designation: undefined })}
                    >
                        <SearchableOptionList
                            options={designations.map((designation) => ({
                                value: designation.code,
                                label: designation.name ?? designation.code,
                            }))}
                            value={filters.designation}
                            onSelect={(v) => applyFilters({ designation: v })}
                            searchPlaceholder={t('Search designations…')}
                        />
                    </FilterPill>

                    {/* Unit */}
                    <FilterPill
                        label={t('Unit')}
                        activeLabel={filters.current_unit_id ? (units.find((u) => String(u.id) === filters.current_unit_id) ? localeName(units.find((u) => String(u.id) === filters.current_unit_id)!, locale) : filters.current_unit_id) : undefined}
                        onClear={() => applyFilters({ current_unit_id: undefined })}
                    >
                        <SearchableOptionList
                            options={units.map((u) => ({ value: String(u.id), label: localeName(u, locale) }))}
                            value={filters.current_unit_id}
                            onSelect={(v) => applyFilters({ current_unit_id: v })}
                            searchPlaceholder={t('Search units…')}
                        />
                    </FilterPill>

                    {/* Home district */}
                    <FilterPill
                        label={t('Home district')}
                        activeLabel={filters.home_district_id ? (districts.find((d) => String(d.id) === filters.home_district_id) ? localeName(districts.find((d) => String(d.id) === filters.home_district_id)!, locale) : filters.home_district_id) : undefined}
                        onClear={() => applyFilters({ home_district_id: undefined })}
                    >
                        <SearchableOptionList
                            options={districts.map((d) => ({ value: String(d.id), label: localeName(d, locale) }))}
                            value={filters.home_district_id}
                            onSelect={(v) => applyFilters({ home_district_id: v })}
                            searchPlaceholder={t('Search districts…')}
                        />
                    </FilterPill>

                    {/* Posting district */}
                    <FilterPill
                        label={t('Posting district')}
                        activeLabel={filters.posting_district_id ? (districts.find((d) => String(d.id) === filters.posting_district_id) ? localeName(districts.find((d) => String(d.id) === filters.posting_district_id)!, locale) : filters.posting_district_id) : undefined}
                        onClear={() => applyFilters({ posting_district_id: undefined })}
                    >
                        <SearchableOptionList
                            options={districts.map((d) => ({ value: String(d.id), label: localeName(d, locale) }))}
                            value={filters.posting_district_id}
                            onSelect={(v) => applyFilters({ posting_district_id: v })}
                            searchPlaceholder={t('Search districts…')}
                        />
                    </FilterPill>

                    {/* Gender */}
                    <FilterPill
                        label={t('Gender')}
                        activeLabel={filters.gender ? t(GENDER_OPTIONS.find((g) => g.value === filters.gender)?.label ?? filters.gender) : undefined}
                        onClear={() => applyFilters({ gender: undefined })}
                    >
                        <OptionList
                            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: t(g.label) }))}
                            value={filters.gender}
                            onSelect={(v) => applyFilters({ gender: v })}
                        />
                    </FilterPill>

                    {/* Blood group */}
                    <FilterPill
                        label={t('Blood group')}
                        activeLabel={filters.blood_group}
                        onClear={() => applyFilters({ blood_group: undefined })}
                    >
                        <OptionList
                            options={BLOOD_GROUP_OPTIONS.map((bg) => ({ value: bg, label: bg }))}
                            value={filters.blood_group}
                            onSelect={(v) => applyFilters({ blood_group: v })}
                        />
                    </FilterPill>

                    {/* Playable sport */}
                    <FilterPill
                        label={t('Playable sport')}
                        activeLabel={filters.sport_id ? (sports.find((s) => String(s.id) === filters.sport_id)?.name ?? filters.sport_id) : undefined}
                        onClear={() => applyFilters({ sport_id: undefined })}
                    >
                        <SearchableOptionList
                            options={sports.map((s) => ({ value: String(s.id), label: s.name }))}
                            value={filters.sport_id}
                            onSelect={(v) => applyFilters({ sport_id: v })}
                            searchPlaceholder={t('Search sports…')}
                        />
                    </FilterPill>

                    {/* Joining year range */}
                    <FilterPill
                        label={t('Joining year')}
                        activeLabel={
                            filters.joining_year_from || filters.joining_year_to
                                ? [filters.joining_year_from ?? '…', filters.joining_year_to ?? '…'].join('–')
                                : undefined
                        }
                        onClear={() => {
                            setYearFrom('');
                            setYearTo('');
                            applyFilters({ joining_year_from: undefined, joining_year_to: undefined });
                        }}
                    >
                        <div className="flex items-center gap-2 p-3">
                            <Input
                                type="number"
                                placeholder={t('From')}
                                min={1950}
                                max={new Date().getFullYear()}
                                className="h-8 w-20 text-sm"
                                value={yearFrom}
                                onChange={(e) => setYearFrom(e.target.value)}
                                onBlur={() => applyFilters({ joining_year_from: yearFrom || undefined })}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters({ joining_year_from: yearFrom || undefined })}
                            />
                            <span className="text-xs text-muted-foreground">–</span>
                            <Input
                                type="number"
                                placeholder={t('To')}
                                min={1950}
                                max={new Date().getFullYear()}
                                className="h-8 w-20 text-sm"
                                value={yearTo}
                                onChange={(e) => setYearTo(e.target.value)}
                                onBlur={() => applyFilters({ joining_year_to: yearTo || undefined })}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters({ joining_year_to: yearTo || undefined })}
                            />
                        </div>
                    </FilterPill>

                    {/* Clear all */}
                    {hasAnyFilter && (
                        <button
                            type="button"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={clearAll}
                        >
                            <X className="mr-1 inline size-3" />
                            {t('Clear filters')}
                        </button>
                    )}
                </div>

                {/* Result count when filtering */}
                {hasAnyFilter && (
                    <p className="text-xs text-muted-foreground">
                        {members.total} {t('results')}
                    </p>
                )}

                {/* Table */}
                <div className="overflow-hidden rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-0 pr-0">
                                    <Checkbox
                                        checked={allPageSelected}
                                        data-state={somePageSelected && !allPageSelected ? 'indeterminate' : undefined}
                                        onCheckedChange={togglePage}
                                        aria-label={t('Select all on page')}
                                    />
                                </TableHead>
                                <TableHead>{t('Sr no')}</TableHead>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('PNO')}</TableHead>
                                <TableHead>{t('Playable sports')}</TableHead>
                                <TableHead>{t('Category')}</TableHead>
                                <TableHead>{t('Level')}</TableHead>
                                <TableHead>{t('Posting unit / district')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="w-0 text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                                        {hasAnyFilter
                                            ? t('No members match your filters.')
                                            : t('No members yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.data.map((member, index) => (
                                    <TableRow
                                        key={member.id}
                                        data-selected={selectedIds.has(member.id) || undefined}
                                        className="cursor-pointer data-[selected]:bg-primary/5"
                                        onClick={() => router.visit(MemberController.show.url(member.id))}
                                    >
                                        <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.has(member.id)}
                                                onCheckedChange={() => toggleRow(member.id)}
                                                aria-label={t('Select row')}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {(members.from ?? 1) + index}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex min-w-0 items-center gap-2">
                                                {member.rank && (
                                                    <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-muted-foreground">
                                                        {member.rank}
                                                    </span>
                                                )}
                                                <span className="truncate font-medium">{member.full_name ?? '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {member.pno ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <SportCell member={member} />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={CATEGORY_BADGE_CLASS[displayCategory(member.player_category)]}>
                                                {t(displayCategory(member.player_category))}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={LEVEL_BADGE_CLASS[member.player_level]}>
                                                {t(member.player_level)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {postingLocation(member) ?? <span className="select-none text-border">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[member.current_status] ?? 'outline'}>
                                                {t(member.current_status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-0" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t('Quick info')}
                                                    onClick={(e) => {
 e.stopPropagation(); setQuickViewId(member.id);
}}
                                                >
                                                    <Info className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title={t('View')} asChild>
                                                    <Link href={MemberController.show.url(member.id)}>
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

                {/* Pagination + per-page selector */}
                <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    {/* Per-page selector */}
                    <div className="flex items-center gap-2 text-xs">
                        <span>{t('Rows per page')}</span>
                        {PER_PAGE_OPTIONS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={[
                                    'inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors',
                                    n === perPage
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-input bg-background hover:bg-accent',
                                ].join(' ')}
                                onClick={() => {
                                    const params: Record<string, string> = { per_page: String(n) };
                                    const filterKeys: [keyof Filters, string][] = [
                                        ['q', 'filter[q]'],
                                        ['current_status', 'filter[current_status]'],
                                        ['player_category', 'filter[player_category]'],
                                        ['player_level', 'filter[player_level]'],
                                        ['current_unit_id', 'filter[current_unit_id]'],
                                        ['home_district_id', 'filter[home_district_id]'],
                                        ['posting_district_id', 'filter[posting_district_id]'],
                                        ['gender', 'filter[gender]'],
                                        ['blood_group', 'filter[blood_group]'],
                                        ['sport_id', 'filter[sport_id]'],
                                        ['joining_year_from', 'filter[joining_year_from]'],
                                        ['joining_year_to', 'filter[joining_year_to]'],
                                    ];

                                    for (const [k, param] of filterKeys) {
                                        if (filters[k]) {
params[param] = filters[k]!;
}
                                    }

                                    router.get(MemberController.index.url(), params, { preserveState: false, replace: true });
                                }}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    {/* Page links (only shown when multi-page) */}
                    {members.last_page > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs">
                                {members.from !== null
                                    ? t('Showing :from–:to of :total')
                                        .replace(':from', String(members.from))
                                        .replace(':to', String(members.to ?? ''))
                                        .replace(':total', String(members.total))
                                    : ''}
                            </span>
                            <div className="flex items-center gap-1">
                                {members.links.map((link, i) =>
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
            </div>

            {/* Export Dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-w-lg" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{t('Export members')}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.size > 0
                                ? t('Exporting :n selected members.').replace(':n', String(selectedIds.size))
                                : hasAnyFilter
                                    ? t('Exporting filtered results (:count total).').replace(':count', String(members.total))
                                    : t('Exporting all :count members.').replace(':count', String(totalCount))}
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">{t('Select columns to export')}</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline"
                                        onClick={() => setSelectedColumns(ALL_COLUMNS.map((c) => c.key))}
                                    >
                                        {t('Select all')}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:underline"
                                        onClick={() => setSelectedColumns([])}
                                    >
                                        {t('Clear')}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                {ALL_COLUMNS.map((col) => (
                                    <label key={col.key} className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={selectedColumns.includes(col.key)}
                                            onCheckedChange={(checked) => {
                                                setSelectedColumns((prev) =>
                                                    checked
                                                        ? [...prev, col.key]
                                                        : prev.filter((k) => k !== col.key),
                                                );
                                            }}
                                        />
                                        {t(col.label)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                handlePrint();
                                setExportOpen(false);
                            }}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                        <Button
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                window.location.href = buildExportUrl();
                                setExportOpen(false);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download Excel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <MemberQuickView
                memberId={quickViewId}
                open={quickViewId !== null}
                onClose={() => setQuickViewId(null)}
            />
        </>
    );
}

MembersIndex.layout = {
    breadcrumbs: [
        { title: 'Members', href: MemberController.index.url() },
    ],
};
