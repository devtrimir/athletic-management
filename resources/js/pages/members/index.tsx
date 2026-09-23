import { Head, Link, router, usePage } from '@inertiajs/react';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
    Check,
    ChevronDown,
    Download,
    Plus,
    Printer,
    Search,
    Upload,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import {
    index as exportMembersUrl,
    print as printMembersUrl,
} from '@/actions/App/Http/Controllers/MemberExportController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { MemberImportDialog } from '@/components/members/member-import-dialog';
import type {
    MasterOption,
    PaginatedMembers,
    SportOption,
} from '@/components/members/member-listing-types';
import { MemberQuickView } from '@/components/members/member-quick-view';
import { MembersTable } from '@/components/members/members-table';
import { OptionMultiSelect } from '@/components/option-multi-select';
import { PriorityFilterRow } from '@/components/priority-filter-row';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import { PLAYER_CATEGORIES, playerCategoryLabel } from '@/lib/player-category';

type UnitOption = { id: number; name: string };
type DistrictOption = { id: number; name: string };
type LevelOption = { code: string; label_en: string; label_hi: string };

type Filters = {
    q?: string;
    status_scope?: 'active' | 'inactive' | 'archived';
    current_status?: string;
    player_category?: string;
    player_level?: string;
    rank?: string;
    current_unit_id?: string;
    home_district_id?: string;
    posting_district_id?: string;
    gender?: string;
    blood_group?: string;
    sport_id?: string;
    sport_ids?: string[];
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
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'home_district', label: 'Home district' },
    { key: 'posting_district', label: 'Posting' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'initial_rank', label: 'Initial rank' },
    { key: 'playable_sports', label: 'Playable sports' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

// Core set pre-selected for export/print — all 18 columns squeeze an A4
// page; users can widen the selection in the column picker.
const DEFAULT_EXPORT_COLUMNS = [
    'pno',
    'full_name',
    'father_name',
    'gender',
    'dob',
    'rank',
    'mobile',
    'player_category',
    'player_level',
    'home_district',
    'playable_sports',
];

const GENDER_OPTIONS: { value: string; label: string }[] = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other gender' },
];
const BLOOD_GROUP_OPTIONS = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
] as const;
const STATUS_TABS = [
    { value: 'active', label: 'Active members' },
    { value: 'inactive', label: 'Inactive members' },
    { value: 'archived', label: 'Archived members' },
] as const;

function localeName(entity: { name: string }, locale: string): string {
    return locale === 'en' ? entity.name : (entity.name ?? entity.name);
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
                        <span className="inline-flex animate-in items-center gap-1.5 duration-150 fade-in-0">
                            <span className="text-primary/50">·</span>
                            <span className="max-w-24 truncate font-semibold">
                                {activeLabel}
                            </span>
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
                        </span>
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
                    onClick={() =>
                        onSelect(value === opt.value ? undefined : opt.value)
                    }
                >
                    <Check
                        className={[
                            'size-3.5 shrink-0',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                        ].join(' ')}
                    />
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
            <CommandInput
                placeholder={searchPlaceholder}
                className="h-8 text-sm"
            />
            <CommandList className="max-h-52">
                <CommandEmpty>—</CommandEmpty>
                <CommandGroup>
                    {options.map((opt) => (
                        <CommandItem
                            key={opt.value}
                            value={opt.label}
                            onSelect={() =>
                                onSelect(
                                    value === opt.value ? undefined : opt.value,
                                )
                            }
                            className="gap-2"
                        >
                            <Check
                                className={[
                                    'size-3.5 shrink-0',
                                    value === opt.value
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                ].join(' ')}
                            />
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
    levels,
    units,
    districts,
    sports,
    ranks,
    totalCount,
    statusCounts,
    perPage,
}: {
    members: PaginatedMembers;
    filters: Filters;
    levels: LevelOption[];
    units: UnitOption[];
    districts: DistrictOption[];
    sports: SportOption[];
    ranks: MasterOption[];
    totalCount: number;
    statusCounts: { active: number; inactive: number; archived?: number };
    perPage: number;
}) {
    const { t } = useTranslation();
    const { locale, auth } = usePage().props as {
        locale: string;
        auth: {
            permissions: string[];
            user: { organization_id: number } | null;
        };
    };
    const canImport = auth.permissions.includes('imports.run');
    const canDeleteMember = auth.permissions.includes('members.delete');
    const canRestoreMember =
        auth.permissions.includes('members.restore') ||
        auth.permissions.includes('members.delete') ||
        auth.permissions.includes('members.update');
    const organizationId = auth.user?.organization_id ?? null;

    const levelLabel = useCallback(
        (code: string | null | undefined): string =>
            code
                ? (levels.find((l) => l.code === code) ?? {
                      code,
                      label_en: code,
                      label_hi: code,
                  })[locale === 'en' ? 'label_en' : 'label_hi']
                : '',
        [locale, levels],
    );

    const rankMasterLabel = useCallback(
        (rank: MasterOption): string => rank.name,
        [],
    );

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        DEFAULT_EXPORT_COLUMNS,
    );
    const [quickViewId, setQuickViewId] = useState<number | null>(null);

    // Row selection — persists across pagination pages
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const selectedIds = Object.keys(rowSelection).filter(
        (id) => rowSelection[id],
    );
    const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
        (updater) => {
            setRowSelection((previous) =>
                typeof updater === 'function' ? updater(previous) : updater,
            );
        },
        [],
    );

    // Local draft for joining year (applied on blur/enter only to avoid spamming requests)
    const [yearFrom, setYearFrom] = useState(filters.joining_year_from ?? '');
    const [yearTo, setYearTo] = useState(filters.joining_year_to ?? '');
    const selectedSportIds =
        filters.sport_ids ?? (filters.sport_id ? [filters.sport_id] : []);
    const activeStatusScope =
        filters.status_scope ??
        (filters.current_status && filters.current_status !== 'ACTIVE'
            ? 'inactive'
            : 'active');

    const getMemberShowUrl = useCallback(
        (id: number, isArchived?: boolean) => {
            const scope =
                isArchived || activeStatusScope === 'archived'
                    ? 'archived'
                    : activeStatusScope !== 'active'
                      ? activeStatusScope
                      : undefined;

            return MemberController.show.url(
                id,
                scope ? { query: { status_scope: scope } } : undefined,
            );
        },
        [activeStatusScope],
    );

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const merged: Filters = {
                q: query || undefined,
                status_scope: filters.status_scope,
                current_status: filters.current_status,
                player_category: filters.player_category,
                player_level: filters.player_level,
                rank: filters.rank,
                current_unit_id: filters.current_unit_id,
                home_district_id: filters.home_district_id,
                posting_district_id: filters.posting_district_id,
                gender: filters.gender,
                blood_group: filters.blood_group,
                sport_id: filters.sport_id,
                sport_ids: filters.sport_ids,
                joining_year_from: filters.joining_year_from,
                joining_year_to: filters.joining_year_to,
                ...patch,
            };

            const clean: Record<string, string | string[]> = {};
            const mapping: [keyof Filters, string][] = [
                ['q', 'filter[q]'],
                ['status_scope', 'filter[status_scope]'],
                ['current_status', 'filter[current_status]'],
                ['player_category', 'filter[player_category]'],
                ['player_level', 'filter[player_level]'],
                ['rank', 'filter[rank]'],
                ['current_unit_id', 'filter[current_unit_id]'],
                ['home_district_id', 'filter[home_district_id]'],
                ['posting_district_id', 'filter[posting_district_id]'],
                ['gender', 'filter[gender]'],
                ['blood_group', 'filter[blood_group]'],
                ['sport_id', 'filter[sport_id]'],
                ['sport_ids', 'filter[sport_ids]'],
                ['joining_year_from', 'filter[joining_year_from]'],
                ['joining_year_to', 'filter[joining_year_to]'],
            ];

            for (const [k, param] of mapping) {
                const value = merged[k];

                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        clean[param] = value;
                    }

                    continue;
                }

                if (value) {
                    clean[param] = value;
                }
            }

            if (perPage !== 25) {
                clean['per_page'] = String(perPage);
            }

            router.get(MemberController.index.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [query, filters, perPage],
    );

    const buildIndexUrl = useCallback(
        (patch: Partial<Filters> = {}) => {
            const merged: Filters = {
                q: query || undefined,
                status_scope: filters.status_scope,
                current_status: filters.current_status,
                player_category: filters.player_category,
                player_level: filters.player_level,
                rank: filters.rank,
                current_unit_id: filters.current_unit_id,
                home_district_id: filters.home_district_id,
                posting_district_id: filters.posting_district_id,
                gender: filters.gender,
                blood_group: filters.blood_group,
                sport_id: filters.sport_id,
                sport_ids: filters.sport_ids,
                joining_year_from: filters.joining_year_from,
                joining_year_to: filters.joining_year_to,
                ...patch,
            };
            const params = new URLSearchParams();
            const mapping: [keyof Filters, string][] = [
                ['q', 'filter[q]'],
                ['status_scope', 'filter[status_scope]'],
                ['current_status', 'filter[current_status]'],
                ['player_category', 'filter[player_category]'],
                ['player_level', 'filter[player_level]'],
                ['rank', 'filter[rank]'],
                ['current_unit_id', 'filter[current_unit_id]'],
                ['home_district_id', 'filter[home_district_id]'],
                ['posting_district_id', 'filter[posting_district_id]'],
                ['gender', 'filter[gender]'],
                ['blood_group', 'filter[blood_group]'],
                ['sport_id', 'filter[sport_id]'],
                ['sport_ids', 'filter[sport_ids]'],
                ['joining_year_from', 'filter[joining_year_from]'],
                ['joining_year_to', 'filter[joining_year_to]'],
            ];

            for (const [key, param] of mapping) {
                const value = merged[key];

                if (Array.isArray(value)) {
                    value.forEach((item) => params.append(`${param}[]`, item));
                    continue;
                }

                if (value) {
                    params.append(param, value);
                }
            }

            if (perPage !== 25) {
                params.append('per_page', String(perPage));
            }

            const queryString = params.toString();

            return queryString
                ? `${MemberController.index.url()}?${queryString}`
                : MemberController.index.url();
        },
        [filters, perPage, query],
    );

    const changeRowsPerPage = useCallback(
        (value: number) => {
            const url = buildIndexUrl();
            const [path, queryString] = url.split('?');
            const params = new URLSearchParams(queryString ?? '');

            params.set('per_page', String(value));
            params.delete('page');

            router.get(
                `${path}?${params.toString()}`,
                {},
                { preserveState: false, replace: true },
            );
        },
        [buildIndexUrl],
    );

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
        filters.player_category,
        filters.player_level,
        filters.rank,
        filters.current_unit_id,
        filters.home_district_id,
        filters.posting_district_id,
        filters.gender,
        filters.blood_group,
        selectedSportIds.length > 0 ? 'sports' : undefined,
        filters.joining_year_from,
        filters.joining_year_to,
    ].filter(Boolean).length;
    const hasAnyFilter = !!filters.q || activeFilterCount > 0;

    function clearAll() {
        setQuery('');
        setYearFrom('');
        setYearTo('');
        router.get(
            MemberController.index.url(),
            {},
            { preserveState: false, replace: true },
        );
    }

    function appendListParams(params: URLSearchParams): void {
        if (selectedIds.length > 0) {
            // Export only the selected rows by ID
            for (const id of selectedIds) {
                params.append('ids[]', id);
            }
        } else {
            // Export filtered results
            const filterKeys: [keyof Filters, string][] = [
                ['q', 'filter[q]'],
                ['status_scope', 'filter[status_scope]'],
                ['current_status', 'filter[current_status]'],
                ['player_category', 'filter[player_category]'],
                ['player_level', 'filter[player_level]'],
                ['rank', 'filter[rank]'],
                ['current_unit_id', 'filter[current_unit_id]'],
                ['home_district_id', 'filter[home_district_id]'],
                ['posting_district_id', 'filter[posting_district_id]'],
                ['gender', 'filter[gender]'],
                ['blood_group', 'filter[blood_group]'],
                ['sport_id', 'filter[sport_id]'],
                ['sport_ids', 'filter[sport_ids]'],
                ['joining_year_from', 'filter[joining_year_from]'],
                ['joining_year_to', 'filter[joining_year_to]'],
            ];

            for (const [k, param] of filterKeys) {
                const value = filters[k];

                if (Array.isArray(value)) {
                    for (const item of value) {
                        params.append(`${param}[]`, item);
                    }

                    continue;
                }

                if (value) {
                    params.append(param, value);
                }
            }
        }
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        appendListParams(params);

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportMembersUrl.url() + '?' + params.toString();
    }

    function buildPrintUrl(): string {
        const params = new URLSearchParams();

        appendListParams(params);

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return printMembersUrl.url() + '?' + params.toString();
    }

    return (
        <>
            <Head title={t('Members')} />

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Members')}
                        description={t('Manage athlete roster')}
                    />
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="relative w-56 shrink-0">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t('Search members…')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
                        {canImport && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImportOpen(true)}
                            >
                                <Upload className="mr-1.5 h-4 w-4" />
                                {t('Import')}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportOpen(true)}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {selectedIds.length > 0
                                ? t('Export :n selected').replace(
                                      ':n',
                                      String(selectedIds.length),
                                  )
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

                {/* Filter bar */}
                <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-hidden rounded-xl border bg-card p-1">
                    <Tabs value={activeStatusScope} className="shrink-0">
                        <TabsList className="h-9 w-auto max-w-full gap-1 rounded-lg border-none bg-muted/60 p-1">
                            {STATUS_TABS.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    asChild
                                    className="group h-7 rounded-md border-b-0 px-4 text-xs font-semibold text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                                >
                                    <Link
                                        href={buildIndexUrl({
                                            status_scope: tab.value,
                                            current_status: undefined,
                                        })}
                                        preserveState
                                        replace
                                    >
                                        {t(tab.label)}
                                        <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                                            {statusCounts[tab.value]}
                                        </span>
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <PriorityFilterRow
                        items={[
                            <div key="category">
                                {/* Category */}
                                <FilterPill
                                    label={t('Category')}
                                    activeLabel={
                                        filters.player_category
                                            ? playerCategoryLabel(
                                                  filters.player_category,
                                                  t,
                                              )
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({
                                            player_category: undefined,
                                        })
                                    }
                                >
                                    <OptionList
                                        options={PLAYER_CATEGORIES.map((c) => ({
                                            value: c,
                                            label: playerCategoryLabel(c, t),
                                        }))}
                                        value={filters.player_category}
                                        onSelect={(v) =>
                                            applyFilters({ player_category: v })
                                        }
                                    />
                                </FilterPill>
                            </div>,
                            <div key="level">
                                {/* Level */}
                                <FilterPill
                                    label={t('Level')}
                                    activeLabel={
                                        filters.player_level
                                            ? levelLabel(filters.player_level)
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({
                                            player_level: undefined,
                                        })
                                    }
                                >
                                    <OptionList
                                        options={levels.map((level) => ({
                                            value: level.code,
                                            label: levelLabel(level.code),
                                        }))}
                                        value={filters.player_level}
                                        onSelect={(v) =>
                                            applyFilters({ player_level: v })
                                        }
                                    />
                                </FilterPill>
                            </div>,
                            <div key="gender">
                                {/* Gender */}
                                <FilterPill
                                    label={t('Gender')}
                                    activeLabel={
                                        filters.gender
                                            ? t(
                                                  GENDER_OPTIONS.find(
                                                      (g) =>
                                                          g.value ===
                                                          filters.gender,
                                                  )?.label ?? filters.gender,
                                              )
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({ gender: undefined })
                                    }
                                >
                                    <OptionList
                                        options={GENDER_OPTIONS.map((g) => ({
                                            value: g.value,
                                            label: t(g.label),
                                        }))}
                                        value={filters.gender}
                                        onSelect={(v) =>
                                            applyFilters({ gender: v })
                                        }
                                    />
                                </FilterPill>
                            </div>,
                            <div key="blood_group">
                                {/* Blood group */}
                                <FilterPill
                                    label={t('Blood group')}
                                    activeLabel={filters.blood_group}
                                    onClear={() =>
                                        applyFilters({ blood_group: undefined })
                                    }
                                >
                                    <OptionList
                                        options={BLOOD_GROUP_OPTIONS.map(
                                            (bg) => ({
                                                value: bg,
                                                label: bg,
                                            }),
                                        )}
                                        value={filters.blood_group}
                                        onSelect={(v) =>
                                            applyFilters({ blood_group: v })
                                        }
                                    />
                                </FilterPill>
                            </div>,
                            <div key="rank">
                                <FilterPill
                                    label={t('Rank')}
                                    activeLabel={
                                        filters.rank
                                            ? ranks.find(
                                                  (rank) =>
                                                      rank.code ===
                                                      filters.rank,
                                              )
                                                ? rankMasterLabel(
                                                      ranks.find(
                                                          (rank) =>
                                                              rank.code ===
                                                              filters.rank,
                                                      )!,
                                                  )
                                                : filters.rank
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({ rank: undefined })
                                    }
                                >
                                    <SearchableOptionList
                                        options={ranks.map((rank) => ({
                                            value: rank.code,
                                            label: rankMasterLabel(rank),
                                        }))}
                                        value={filters.rank}
                                        onSelect={(v) =>
                                            applyFilters({ rank: v })
                                        }
                                        searchPlaceholder={t('Search ranks…')}
                                    />
                                </FilterPill>
                            </div>,
                            <div key="posting">
                                {/* Posting */}
                                <FilterPill
                                    label={t('Posting')}
                                    activeLabel={
                                        filters.current_unit_id
                                            ? units.find(
                                                  (u) =>
                                                      String(u.id) ===
                                                      filters.current_unit_id,
                                              )
                                                ? localeName(
                                                      units.find(
                                                          (u) =>
                                                              String(u.id) ===
                                                              filters.current_unit_id,
                                                      )!,
                                                      locale,
                                                  )
                                                : filters.current_unit_id
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({
                                            current_unit_id: undefined,
                                        })
                                    }
                                >
                                    <SearchableOptionList
                                        options={units.map((u) => ({
                                            value: String(u.id),
                                            label: localeName(u, locale),
                                        }))}
                                        value={filters.current_unit_id}
                                        onSelect={(v) =>
                                            applyFilters({ current_unit_id: v })
                                        }
                                        searchPlaceholder={t(
                                            'Search postings…',
                                        )}
                                    />
                                </FilterPill>
                            </div>,
                            <div key="home_district">
                                {/* Home district */}
                                <FilterPill
                                    label={t('Home district')}
                                    activeLabel={
                                        filters.home_district_id
                                            ? districts.find(
                                                  (d) =>
                                                      String(d.id) ===
                                                      filters.home_district_id,
                                              )
                                                ? localeName(
                                                      districts.find(
                                                          (d) =>
                                                              String(d.id) ===
                                                              filters.home_district_id,
                                                      )!,
                                                      locale,
                                                  )
                                                : filters.home_district_id
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({
                                            home_district_id: undefined,
                                        })
                                    }
                                >
                                    <SearchableOptionList
                                        options={districts.map((d) => ({
                                            value: String(d.id),
                                            label: localeName(d, locale),
                                        }))}
                                        value={filters.home_district_id}
                                        onSelect={(v) =>
                                            applyFilters({
                                                home_district_id: v,
                                            })
                                        }
                                        searchPlaceholder={t(
                                            'Search districts…',
                                        )}
                                    />
                                </FilterPill>
                            </div>,
                            <div key="posting_district">
                                {/* Posting district */}
                                <FilterPill
                                    label={t('Posting district')}
                                    activeLabel={
                                        filters.posting_district_id
                                            ? districts.find(
                                                  (d) =>
                                                      String(d.id) ===
                                                      filters.posting_district_id,
                                              )
                                                ? localeName(
                                                      districts.find(
                                                          (d) =>
                                                              String(d.id) ===
                                                              filters.posting_district_id,
                                                      )!,
                                                      locale,
                                                  )
                                                : filters.posting_district_id
                                            : undefined
                                    }
                                    onClear={() =>
                                        applyFilters({
                                            posting_district_id: undefined,
                                        })
                                    }
                                >
                                    <SearchableOptionList
                                        options={districts.map((d) => ({
                                            value: String(d.id),
                                            label: localeName(d, locale),
                                        }))}
                                        value={filters.posting_district_id}
                                        onSelect={(v) =>
                                            applyFilters({
                                                posting_district_id: v,
                                            })
                                        }
                                        searchPlaceholder={t(
                                            'Search districts…',
                                        )}
                                    />
                                </FilterPill>
                            </div>,
                            <div key="playable_sport">
                                {/* Playable sport */}
                                <OptionMultiSelect
                                    value={selectedSportIds}
                                    onValueChange={(value) =>
                                        applyFilters({
                                            sport_id: undefined,
                                            sport_ids: value,
                                        })
                                    }
                                    options={sports.map((s) => ({
                                        value: String(s.id),
                                        label: s.name,
                                    }))}
                                    placeholder={t('Playable sport')}
                                    searchPlaceholder={t('Search sports…')}
                                    className="h-8 w-48 text-xs"
                                />
                            </div>,
                            <div key="joining_year">
                                {/* Joining year range */}
                                <FilterPill
                                    label={t('Joining year')}
                                    activeLabel={
                                        filters.joining_year_from ||
                                        filters.joining_year_to
                                            ? [
                                                  filters.joining_year_from ??
                                                      '…',
                                                  filters.joining_year_to ??
                                                      '…',
                                              ].join('–')
                                            : undefined
                                    }
                                    onClear={() => {
                                        setYearFrom('');
                                        setYearTo('');
                                        applyFilters({
                                            joining_year_from: undefined,
                                            joining_year_to: undefined,
                                        });
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
                                            onChange={(e) =>
                                                setYearFrom(e.target.value)
                                            }
                                            onBlur={() =>
                                                applyFilters({
                                                    joining_year_from:
                                                        yearFrom || undefined,
                                                })
                                            }
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' &&
                                                applyFilters({
                                                    joining_year_from:
                                                        yearFrom || undefined,
                                                })
                                            }
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            –
                                        </span>
                                        <Input
                                            type="number"
                                            placeholder={t('To')}
                                            min={1950}
                                            max={new Date().getFullYear()}
                                            className="h-8 w-20 text-sm"
                                            value={yearTo}
                                            onChange={(e) =>
                                                setYearTo(e.target.value)
                                            }
                                            onBlur={() =>
                                                applyFilters({
                                                    joining_year_to:
                                                        yearTo || undefined,
                                                })
                                            }
                                            onKeyDown={(e) =>
                                                e.key === 'Enter' &&
                                                applyFilters({
                                                    joining_year_to:
                                                        yearTo || undefined,
                                                })
                                            }
                                        />
                                    </div>
                                </FilterPill>
                            </div>,
                        ]}
                        moreLabel={t('More filters')}
                        lessLabel={t('Less filters')}
                        className="min-w-0 flex-1"
                    />

                    {/* Clear all */}
                    {hasAnyFilter && (
                        <button
                            type="button"
                            className="h-8 shrink-0 animate-in px-2 text-xs text-muted-foreground duration-150 fade-in-0 hover:text-foreground"
                            onClick={clearAll}
                        >
                            <X className="mr-1 inline size-3" />
                            {t('Clear filters')}
                        </button>
                    )}
                </div>

                {/* Result count when filtering */}
                {hasAnyFilter && (
                    <p className="shrink-0 animate-in text-xs text-muted-foreground duration-150 fade-in-0">
                        {members.total} {t('results')}
                    </p>
                )}

                <div className="min-h-0 flex-1 overflow-hidden">
                    <MembersTable
                        members={members}
                        ranks={ranks}
                        locale={locale}
                        levelLabel={levelLabel}
                        hasAnyFilter={hasAnyFilter}
                        rowSelection={rowSelection}
                        onRowSelectionChange={handleRowSelectionChange}
                        getMemberShowUrl={getMemberShowUrl}
                        canDeleteMember={canDeleteMember}
                        canRestoreMember={canRestoreMember}
                        onQuickView={setQuickViewId}
                        t={t}
                    />
                </div>

                <ListingPagination
                    paginator={members}
                    itemLabel={t('members')}
                    rowsPerPage={{
                        value: perPage,
                        options: [...PER_PAGE_OPTIONS],
                        onChange: changeRowsPerPage,
                    }}
                    className="shrink-0 shadow-sm"
                />
            </div>

            {/* Export Dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent
                    className="max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Export members')}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.length > 0
                                ? t('Exporting :n selected members.').replace(
                                      ':n',
                                      String(selectedIds.length),
                                  )
                                : hasAnyFilter
                                  ? t(
                                        'Exporting filtered results (:count total).',
                                    ).replace(':count', String(members.total))
                                  : t('Exporting all :count members.').replace(
                                        ':count',
                                        String(totalCount),
                                    )}
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    {t('Select columns to export')}
                                </Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline"
                                        onClick={() =>
                                            setSelectedColumns(
                                                ALL_COLUMNS.map((c) => c.key),
                                            )
                                        }
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
                                    <label
                                        key={col.key}
                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedColumns.includes(
                                                col.key,
                                            )}
                                            onCheckedChange={(checked) => {
                                                setSelectedColumns((prev) =>
                                                    checked
                                                        ? [...prev, col.key]
                                                        : prev.filter(
                                                              (k) =>
                                                                  k !== col.key,
                                                          ),
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
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                window.open(buildPrintUrl(), '_blank');
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

            {organizationId !== null && (
                <MemberImportDialog
                    open={importOpen}
                    onOpenChange={setImportOpen}
                    organizationId={organizationId}
                />
            )}
        </>
    );
}

MembersIndex.layout = {
    breadcrumbs: [{ title: 'Members', href: MemberController.index.url() }],
};
