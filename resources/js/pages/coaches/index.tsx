import { Head, Link, router } from '@inertiajs/react';
import type {
    OnChangeFn,
    RowSelectionState,
    SortingState,
} from '@tanstack/react-table';
import {
    Check,
    ChevronDown,
    Download,
    Plus,
    Printer,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import CoachController, {
    print as printCoachesUrl,
} from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import { ActiveCoachesTable } from '@/components/coaches/active-coaches-table';
import type {
    PaginatedCoaches,
    SportOption,
} from '@/components/coaches/coach-listing-types';
import { InactiveCoachesTable } from '@/components/coaches/inactive-coaches-table';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { Button } from '@/components/ui/button';
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
    DialogDescription,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import { genderLabel } from '@/lib/coach';

type Filters = {
    status_scope?: 'active' | 'inactive' | 'player_coaches';
    q?: string;
    blood_group?: string;
    coach_status?: string;
    email?: string;
    gender?: string;
    has_certification?: string;
    certification_name?: string;
    certification_type?: string;
    sport_id?: string;
    has_active_assignment?: string;
    assignment_role?: string;
};

const STATUS_TABS = [
    { value: 'active', label: 'Active coaches' },
    { value: 'inactive', label: 'Inactive coaches' },
    { value: 'player_coaches', label: 'Player-Coaches' },
] as const;

type ReportAction = 'print' | 'export';
type PrintOrientation = 'portrait' | 'landscape';

function FilterPill({
    label,
    activeLabel,
    onClear,
    children,
}: {
    label: string;
    activeLabel?: string;
    onClear: () => void;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const isActive = !!activeLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={[
                        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
                        isActive
                            ? 'border-primary/40 bg-primary/8 text-primary hover:bg-primary/12'
                            : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')}
                >
                    <span>{label}</span>
                    {isActive && (
                        <>
                            <span className="text-primary/50">·</span>
                            <span className="max-w-20 truncate font-semibold">
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
    onSelect: (value: string | undefined) => void;
}) {
    return (
        <div className="py-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() =>
                        onSelect(
                            value === option.value ? undefined : option.value,
                        )
                    }
                >
                    <Check
                        className={[
                            'size-3.5 shrink-0',
                            value === option.value
                                ? 'opacity-100'
                                : 'opacity-0',
                        ].join(' ')}
                    />
                    {option.label}
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
    onSelect: (value: string | undefined) => void;
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
                    {options.map((option) => (
                        <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={() =>
                                onSelect(
                                    value === option.value
                                        ? undefined
                                        : option.value,
                                )
                            }
                            className="gap-2"
                        >
                            <Check
                                className={[
                                    'size-3.5 shrink-0',
                                    value === option.value
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                ].join(' ')}
                            />
                            {option.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

export default function CoachesIndex({
    coaches,
    filters,
    sort,
    sports,
    activeCoachCount,
    inactiveCoachCount,
    playerCoachCount,
    certificateTypes,
    genders,
}: {
    coaches: PaginatedCoaches;
    filters: Filters;
    sort?: string | null;
    sports: SportOption[];
    activeCoachCount: number;
    inactiveCoachCount: number;
    playerCoachCount: number;
    certificateTypes: string[];
    genders: string[];
}) {
    const { t } = useTranslation();

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [previousStatusScope, setPreviousStatusScope] = useState(
        filters.status_scope ?? 'active',
    );
    const [reportAction, setReportAction] = useState<ReportAction | null>(null);
    const [printOrientation, setPrintOrientation] =
        useState<PrintOrientation>('landscape');
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeStatusScope = filters.status_scope ?? 'active';
    const currentSort = sort ?? undefined;
    const sortingState: SortingState = currentSort
        ? [
              {
                  id: currentSort.startsWith('-')
                      ? currentSort.slice(1)
                      : currentSort,
                  desc: currentSort.startsWith('-'),
              },
          ]
        : [];
    const selectedIds = Object.keys(rowSelection).filter(
        (id) => rowSelection[id],
    );
    const isInactiveTab =
        activeStatusScope === 'inactive' ||
        activeStatusScope === 'player_coaches';
    function assignmentFilterFromStatus(
        statusScope: Filters['status_scope'],
    ): string | undefined {
        if (statusScope === 'player_coaches') {
            return undefined;
        }

        return statusScope === 'inactive' ? 'false' : 'true';
    }

    const applyFilters = useCallback(
        (patch: Partial<Filters> & { sort?: string }) => {
            const nextStatusScope =
                (patch.status_scope as Filters['status_scope']) ??
                activeStatusScope;
            const assignmentScope = assignmentFilterFromStatus(nextStatusScope);
            const current: Filters = {
                status_scope: nextStatusScope,
                q: query || undefined,
                blood_group: filters.blood_group,
                coach_status: filters.coach_status,
                gender: filters.gender,
                has_certification: filters.has_certification,
                certification_name: filters.certification_name,
                certification_type: filters.certification_type,
                sport_id: filters.sport_id,
                has_active_assignment: assignmentScope,
            };
            const merged: Filters = { ...current, ...patch };
            const mergedAssignmentScope = assignmentFilterFromStatus(
                merged.status_scope ?? nextStatusScope,
            );

            if (mergedAssignmentScope !== undefined) {
                merged.has_active_assignment = mergedAssignmentScope;
            } else {
                delete merged.has_active_assignment;
            }

            const clean: Record<string, string> = {};

            if (merged.q) {
                clean['filter[q]'] = merged.q;
            }

            if (merged.status_scope) {
                clean['filter[status_scope]'] = merged.status_scope;
            }

            if (merged.blood_group) {
                clean['filter[blood_group]'] = merged.blood_group;
            }

            if (merged.coach_status) {
                clean['filter[coach_status]'] = merged.coach_status;
            }

            if (merged.gender) {
                clean['filter[gender]'] = merged.gender;
            }

            if (merged.has_certification) {
                clean['filter[has_certification]'] = merged.has_certification;
            }

            if (merged.certification_name) {
                clean['filter[certification_name]'] = merged.certification_name;
            }

            if (merged.certification_type) {
                clean['filter[certification_type]'] = merged.certification_type;
            }

            if (merged.sport_id) {
                clean['filter[sport_id]'] = merged.sport_id;
            }

            if (merged.has_active_assignment) {
                clean['filter[has_active_assignment]'] =
                    merged.has_active_assignment;
            }

            const nextSort = 'sort' in patch ? patch.sort : currentSort;

            if (nextSort) {
                clean.sort = nextSort;
            }

            router.get(CoachController.index.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [
            query,
            activeStatusScope,
            currentSort,
            filters.blood_group,
            filters.coach_status,
            filters.gender,
            filters.has_certification,
            filters.certification_name,
            filters.certification_type,
            filters.sport_id,
        ],
    );

    const handleSortingChange: OnChangeFn<SortingState> = useCallback(
        (updater) => {
            const next =
                typeof updater === 'function' ? updater(sortingState) : updater;
            const nextSort = next[0]
                ? `${next[0].desc ? '-' : ''}${next[0].id}`
                : '';

            applyFilters({ sort: nextSort });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [applyFilters, currentSort],
    );

    const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
        (updater) => {
            setRowSelection((previous) =>
                typeof updater === 'function' ? updater(previous) : updater,
            );
        },
        [],
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

    if (activeStatusScope !== previousStatusScope) {
        setPreviousStatusScope(activeStatusScope);
        setRowSelection({});
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        if (selectedIds.length > 0) {
            for (const id of selectedIds) {
                params.append('ids[]', id);
            }
        } else {
            if (filters.q) {
                params.append('filter[q]', filters.q);
            }

            params.append('filter[status_scope]', activeStatusScope);

            if (filters.blood_group) {
                params.append('filter[blood_group]', filters.blood_group);
            }

            if (filters.coach_status) {
                params.append('filter[coach_status]', filters.coach_status);
            }

            if (filters.gender) {
                params.append('filter[gender]', filters.gender);
            }

            if (filters.has_certification) {
                params.append(
                    'filter[has_certification]',
                    filters.has_certification,
                );
            }

            if (filters.certification_name) {
                params.append(
                    'filter[certification_name]',
                    filters.certification_name,
                );
            }

            if (filters.certification_type) {
                params.append(
                    'filter[certification_type]',
                    filters.certification_type,
                );
            }

            if (filters.sport_id) {
                params.append('filter[sport_id]', filters.sport_id);
            }

            if (activeStatusScope) {
                const assignmentFilter =
                    assignmentFilterFromStatus(activeStatusScope);

                if (assignmentFilter) {
                    params.append(
                        'filter[has_active_assignment]',
                        assignmentFilter,
                    );
                }
            }
        }

        return exportCoachesUrl.url() + '?' + params.toString();
    }

    function buildPrintUrl(): string {
        const params = new URLSearchParams();
        const assignmentFilter = assignmentFilterFromStatus(activeStatusScope);
        const printFilters: Filters = {
            q: query || filters.q,
            status_scope: activeStatusScope,
        };

        if (assignmentFilter) {
            printFilters.has_active_assignment = assignmentFilter;
        }

        if (filters.blood_group) {
            printFilters.blood_group = filters.blood_group;
        }

        if (filters.coach_status) {
            printFilters.coach_status = filters.coach_status;
        }

        if (filters.gender) {
            printFilters.gender = filters.gender;
        }

        if (filters.has_certification) {
            printFilters.has_certification = filters.has_certification;
        }

        if (filters.certification_name) {
            printFilters.certification_name = filters.certification_name;
        }

        if (filters.certification_type) {
            printFilters.certification_type = filters.certification_type;
        }

        if (filters.sport_id) {
            printFilters.sport_id = filters.sport_id;
        }

        for (const [key, value] of Object.entries(printFilters)) {
            if (value) {
                params.append(`filter[${key}]`, value);
            }
        }

        params.append('orientation', printOrientation);

        return printCoachesUrl.url() + '?' + params.toString();
    }

    function buildIndexUrl(patch: Partial<Filters> = {}): string {
        const merged: Filters = {
            ...filters,
            status_scope: activeStatusScope,
            q: query || undefined,
            ...patch,
        };
        const assignmentFilter = assignmentFilterFromStatus(
            merged.status_scope ?? activeStatusScope,
        );

        if (assignmentFilter) {
            merged.has_active_assignment = assignmentFilter;
        } else {
            delete merged.has_active_assignment;
        }

        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(merged)) {
            if (value) {
                params.set(`filter[${key}]`, value);
            }
        }

        const queryString = params.toString();

        return queryString
            ? `${CoachController.index.url()}?${queryString}`
            : CoachController.index.url();
    }

    function handlePrint() {
        window.open(buildPrintUrl(), '_blank', 'noopener,noreferrer');
    }

    const hasActiveFilters = !!(
        filters.q ||
        filters.blood_group ||
        filters.coach_status ||
        filters.gender ||
        filters.has_certification ||
        filters.certification_name ||
        filters.certification_type ||
        filters.sport_id ||
        filters.assignment_role
    );

    const bloodGroupOptions = [
        'A+',
        'A-',
        'B+',
        'B-',
        'O+',
        'O-',
        'AB+',
        'AB-',
    ].map((value) => ({ value, label: value }));
    const genderOptions = genders.map((gender) => ({
        value: gender,
        label: genderLabel(gender, t),
    }));
    const certificationOptions = [
        { value: 'true', label: t('Has certification') },
        { value: 'false', label: t('No certification') },
    ];
    const certificateTypeOptions = certificateTypes.map((certType) => ({
        value: certType,
        label: t(certType),
    }));
    const sportOptions = sports.map((sport) => ({
        value: sport.id.toString(),
        label: sport.name,
    }));
    const assignmentOptions = [
        { value: 'true', label: t('Has active assignment') },
        { value: 'false', label: t('No active assignment') },
    ];
    const activeFilterCount = [
        filters.email,
        filters.gender,
        filters.has_certification,
        filters.certification_name,
        filters.certification_type,
        filters.sport_id,
        filters.assignment_role,
    ].filter(Boolean).length;

    function optionLabel(
        options: { value: string; label: string }[],
        value: string | undefined,
    ): string | undefined {
        return options.find((option) => option.value === value)?.label;
    }

    function clearAllFilters(): void {
        setQuery('');
        setRowSelection({});
        router.get(
            CoachController.index.url(),
            { 'filter[status_scope]': activeStatusScope },
            { preserveState: false, replace: true },
        );
    }

    return (
        <>
            <Head title={t('Coaches')} />

            <div className="flex h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden">
                <div className="shrink-0 space-y-3">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <Heading
                            variant="small"
                            title={t('Coaches')}
                            description={t(
                                'Review coach profiles, assignments, and roster exports.',
                            )}
                        />
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReportAction('print')}
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReportAction('export')}
                            >
                                <Download className="mr-1.5 h-4 w-4" />
                                {selectedIds.length > 0
                                    ? t('Export :n selected').replace(
                                          ':n',
                                          String(selectedIds.length),
                                      )
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

                    <div className="max-w-full min-w-0 space-y-1.5 rounded-xl border bg-card p-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Tabs
                                value={activeStatusScope}
                                className="shrink-0"
                            >
                                <TabsList className="h-7 w-auto max-w-full gap-1 rounded-md border-none bg-transparent p-0">
                                    {STATUS_TABS.map((tab) => {
                                        const count =
                                            tab.value === 'active'
                                                ? activeCoachCount
                                                : tab.value === 'inactive'
                                                  ? inactiveCoachCount
                                                  : playerCoachCount;

                                        return (
                                            <TabsTrigger
                                                key={tab.value}
                                                value={tab.value}
                                                asChild
                                                className="h-7 rounded-md border-b-0 px-2.5 text-xs font-medium data-[state=active]:border-primary/40 data-[state=active]:bg-primary/8 data-[state=active]:text-primary data-[state=active]:shadow-none"
                                            >
                                                <Link
                                                    href={buildIndexUrl({
                                                        status_scope: tab.value,
                                                    })}
                                                    preserveState
                                                    replace
                                                >
                                                    {t(tab.label)}
                                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        {count}
                                                    </span>
                                                </Link>
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </Tabs>

                            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />

                            <div className="relative w-full sm:w-auto sm:max-w-[260px] sm:flex-1">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={t('Search coaches…')}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="h-8 pl-8"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {activeFilterCount > 0 && (
                                    <span className="text-[11px]">
                                        {t(':count filters active').replace(
                                            ':count',
                                            String(activeFilterCount),
                                        )}
                                    </span>
                                )}
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAllFilters}
                                        className="h-7 px-2 text-xs"
                                    >
                                        <X className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Clear filters')}
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <FilterPill
                                    label={t('Blood group')}
                                    activeLabel={filters.blood_group}
                                    onClear={() =>
                                        applyFilters({ blood_group: undefined })
                                    }
                                >
                                    <OptionList
                                        options={bloodGroupOptions}
                                        value={filters.blood_group}
                                        onSelect={(value) =>
                                            applyFilters({ blood_group: value })
                                        }
                                    />
                                </FilterPill>

                                <FilterPill
                                    label={t('Gender')}
                                    activeLabel={optionLabel(
                                        genderOptions,
                                        filters.gender,
                                    )}
                                    onClear={() =>
                                        applyFilters({ gender: undefined })
                                    }
                                >
                                    <OptionList
                                        options={genderOptions}
                                        value={filters.gender}
                                        onSelect={(value) =>
                                            applyFilters({ gender: value })
                                        }
                                    />
                                </FilterPill>

                                <FilterPill
                                    label={t('Certification')}
                                    activeLabel={optionLabel(
                                        certificationOptions,
                                        filters.has_certification,
                                    )}
                                    onClear={() =>
                                        applyFilters({
                                            has_certification: undefined,
                                        })
                                    }
                                >
                                    <OptionList
                                        options={certificationOptions}
                                        value={filters.has_certification}
                                        onSelect={(value) =>
                                            applyFilters({
                                                has_certification: value,
                                            })
                                        }
                                    />
                                </FilterPill>

                                <FilterPill
                                    label={t('Sport')}
                                    activeLabel={optionLabel(
                                        sportOptions,
                                        filters.sport_id,
                                    )}
                                    onClear={() =>
                                        applyFilters({ sport_id: undefined })
                                    }
                                >
                                    <SearchableOptionList
                                        options={sportOptions}
                                        value={filters.sport_id}
                                        onSelect={(value) =>
                                            applyFilters({ sport_id: value })
                                        }
                                        searchPlaceholder={t('Search sports…')}
                                    />
                                </FilterPill>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setShowMoreFilters((prev) => !prev)
                                }
                                className="h-7 px-2.5 text-xs"
                            >
                                {showMoreFilters
                                    ? t('Less filters')
                                    : t('More filters')}
                            </Button>
                        </div>
                        {showMoreFilters ? (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <FilterPill
                                    label={t('Certificate type')}
                                    activeLabel={optionLabel(
                                        certificateTypeOptions,
                                        filters.certification_type,
                                    )}
                                    onClear={() =>
                                        applyFilters({
                                            certification_type: undefined,
                                        })
                                    }
                                >
                                    <SearchableOptionList
                                        options={certificateTypeOptions}
                                        value={filters.certification_type}
                                        onSelect={(value) =>
                                            applyFilters({
                                                certification_type: value,
                                            })
                                        }
                                        searchPlaceholder={t(
                                            'Search certificate types…',
                                        )}
                                    />
                                </FilterPill>

                                <FilterPill
                                    label={t('Certificate name')}
                                    activeLabel={filters.certification_name}
                                    onClear={() =>
                                        applyFilters({
                                            certification_name: undefined,
                                        })
                                    }
                                >
                                    <div className="w-64 p-3">
                                        <Input
                                            autoFocus
                                            placeholder={t(
                                                'Certification name',
                                            )}
                                            value={
                                                filters.certification_name ?? ''
                                            }
                                            onChange={(e) =>
                                                applyFilters({
                                                    certification_name:
                                                        e.target.value ||
                                                        undefined,
                                                })
                                            }
                                        />
                                    </div>
                                </FilterPill>

                                <FilterPill
                                    label={t('Assignment')}
                                    activeLabel={optionLabel(
                                        assignmentOptions,
                                        filters.has_active_assignment,
                                    )}
                                    onClear={() =>
                                        applyFilters({
                                            has_active_assignment: undefined,
                                        })
                                    }
                                >
                                    <OptionList
                                        options={assignmentOptions}
                                        value={filters.has_active_assignment}
                                        onSelect={(value) =>
                                            applyFilters({
                                                has_active_assignment: value,
                                            })
                                        }
                                    />
                                </FilterPill>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="min-h-0 max-w-full min-w-0 flex-1 overflow-hidden">
                    {isInactiveTab ? (
                        <InactiveCoachesTable
                            coaches={coaches}
                            hasActiveFilters={hasActiveFilters}
                            sorting={sortingState}
                            onSortingChange={handleSortingChange}
                            rowSelection={rowSelection}
                            onRowSelectionChange={handleRowSelectionChange}
                            t={t}
                        />
                    ) : (
                        <ActiveCoachesTable
                            coaches={coaches.data}
                            sports={sports}
                            fromIndex={coaches.from}
                            hasActiveFilters={hasActiveFilters}
                            rowSelection={rowSelection}
                            onRowSelectionChange={handleRowSelectionChange}
                            t={t}
                        />
                    )}
                </div>

                <ListingPagination
                    paginator={coaches}
                    itemLabel={t('coaches')}
                    className="shrink-0 shadow-sm"
                />
            </div>

            <ExportDialog
                action={reportAction}
                open={reportAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReportAction(null);
                    }
                }}
                selectedIds={selectedIds}
                coaches={coaches}
                printOrientation={printOrientation}
                setPrintOrientation={setPrintOrientation}
                buildExportUrl={buildExportUrl}
                onPrint={handlePrint}
                t={t}
            />
        </>
    );
}

CoachesIndex.layout = {
    breadcrumbs: [{ title: 'Coaches', href: CoachController.index.url() }],
};

function ExportDialog({
    action,
    open,
    onOpenChange,
    selectedIds,
    coaches,
    printOrientation,
    setPrintOrientation,
    buildExportUrl,
    onPrint,
    t,
}: {
    action: ReportAction | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selectedIds: string[];
    coaches: PaginatedCoaches;
    printOrientation: PrintOrientation;
    setPrintOrientation: Dispatch<SetStateAction<PrintOrientation>>;
    buildExportUrl: () => string;
    onPrint: () => void;
    t: (key: string) => string;
}) {
    const isPrint = action === 'print';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isPrint ? t('Print coaches') : t('Export coaches')}
                    </DialogTitle>
                    <DialogDescription>
                        {isPrint
                            ? t(
                                  'Printing all :count filtered coaches.',
                              ).replace(':count', String(coaches.total))
                            : selectedIds.length > 0
                              ? t('Exporting :n selected coaches.').replace(
                                    ':n',
                                    String(selectedIds.length),
                                )
                              : t('Exporting all :count coaches.').replace(
                                    ':count',
                                    String(coaches.total),
                                )}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
                    {isPrint ? (
                        <div className="mt-5 space-y-2">
                            <Label htmlFor="print-orientation">
                                {t('Print orientation')}
                            </Label>
                            <Select
                                value={printOrientation}
                                onValueChange={(value) =>
                                    setPrintOrientation(
                                        value as PrintOrientation,
                                    )
                                }
                            >
                                <SelectTrigger id="print-orientation">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="landscape">
                                        {t('Landscape')}
                                    </SelectItem>
                                    <SelectItem value="portrait">
                                        {t('Portrait')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    {isPrint ? (
                        <Button
                            onClick={() => {
                                onPrint();
                                onOpenChange(false);
                            }}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                window.location.href = buildExportUrl();
                                onOpenChange(false);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download Excel')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
