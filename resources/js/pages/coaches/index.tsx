import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Download,
    Plus,
    Printer,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import CoachController, {
    print as printCoachesUrl,
} from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Coach = {
    id: number;
    full_name: string;
    pno: string | null;
    blood_group?: string | null;
    gender?: string | null;
    mobile: string | null;
    email: string | null;
    coach_status: string | null;
    rank_master?: {
        id: number;
        code: string | null;
        name: string | null;
        short_name: string | null;
    } | null;
    nis_master?: {
        id: number;
        kind: string | null;
        code: string | null;
        name: string | null;
        short_name: string | null;
    } | null;
    district?: { id: number; name: string } | null;
    unit?: { id: number; name: string } | null;
    sports?: {
        id: number;
        name: string;
        is_primary?: boolean;
        level_master_id?: number | null;
        level?: string | null;
        sport_event?: string | null;
        effective_from?: string | null;
        effective_to?: string | null;
        notes?: string | null;
        pivot?: {
            is_primary?: boolean;
            level_master_id?: number | null;
            level?: string | null;
            sport_event?: string | null;
            effective_from?: string | null;
            effective_to?: string | null;
            notes?: string | null;
        };
    }[];
    current_assignments?: {
        id: number;
        role: string | null;
        assigned_at: string | null;
        session?: {
            id: number;
            name: string;
        } | null;
        team?: {
            id: number;
            name: string;
            sport_id: number | null;
            location_label?: string | null;
            sport?: {
                id: number;
                name: string;
            } | null;
            session?: {
                id: number;
                name: string;
            } | null;
        } | null;
    }[];
};

type TeamCoach = {
    id: number;
    rank: string | null;
    pno: string | null;
    full_name: string;
    mobile: string | null;
    posting: string;
    role: string;
    team: string;
    nis_master_name: string | null;
};

type SportTeamGroupRow = {
    sport: string;
    team: string;
    coaches: TeamCoach[];
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

type SportOption = {
    id: number;
    name: string;
};

type Filters = {
    status_scope?: 'active' | 'inactive';
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

function buildCoachTeamSportRows(
    coaches: Coach[],
    sports: SportOption[],
    t: (key: string) => string,
): SportTeamGroupRow[] {
    const sportNameById = new Map(
        sports.map((sport) => [sport.id, sport.name]),
    );
    const getRoleOrder = (role: string): number => {
        const normalizedRole = role?.toLowerCase() ?? '';

        if (normalizedRole.includes('head')) {
            return 0;
        }

        if (normalizedRole.includes('assistant')) {
            return 1;
        }

        return 2;
    };

    const formatRole = (role: string | null): string => {
        const normalizedRole = role?.trim().toLowerCase();

        if (normalizedRole === 'head') {
            return t('Head Coach');
        }

        if (normalizedRole === 'assistant') {
            return t('Assistant Coach');
        }

        return role ? role : t('Coach');
    };

    const grouped = new Map<string, SportTeamGroupRow>();
    const unassigned: SportTeamGroupRow[] = [];

    coaches.forEach((coach) => {
        const assignments = coach.current_assignments ?? [];

        if (assignments.length === 0) {
            unassigned.push({
                sport: t('Unassigned'),
                team: '-',
                coaches: [
                    {
                        id: coach.id,
                        rank:
                            coach.rank_master?.name ??
                            coach.rank_master?.short_name ??
                            null,
                        pno: coach.pno,
                        full_name: coach.full_name,
                        mobile: coach.mobile,
                        posting: [coach.unit?.name, coach.district?.name]
                            .filter(Boolean)
                            .join(' - '),
                        team: '-',
                        role: t('Inactive'),
                        nis_master_name: coach.nis_master?.name ?? null,
                    },
                ],
            });

            return;
        }

        assignments.forEach((assignment) => {
            const teamId = assignment.team?.id ?? 0;
            const sportId =
                assignment.team?.sport?.id ?? assignment.team?.sport_id ?? 0;
            const key = `${sportId}-${teamId}`;

            const row =
                grouped.get(key) ??
                ({
                    sport:
                        assignment.team?.sport?.name ??
                        (sportId ? sportNameById.get(sportId) : undefined) ??
                        t('Unspecified sport'),
                    team: assignment.team?.name ?? t('Unspecified team'),
                    coaches: [],
                } as SportTeamGroupRow);

            if (
                !row.coaches.some((coachInTeam) => coachInTeam.id === coach.id)
            ) {
                row.coaches.push({
                    id: coach.id,
                    rank:
                        coach.rank_master?.name ??
                        coach.rank_master?.short_name ??
                        null,
                    pno: coach.pno,
                    full_name: coach.full_name,
                    mobile: coach.mobile,
                    posting: [coach.unit?.name, coach.district?.name]
                        .filter(Boolean)
                        .join(' - '),
                    team: assignment.team?.name ?? t('Unspecified team'),
                    role: formatRole(assignment.role),
                    nis_master_name: coach.nis_master?.name ?? null,
                });
            }

            grouped.set(key, row);
        });
    });

    const rows = [...grouped.values(), ...unassigned];

    rows.forEach((row) => {
        row.coaches.sort((left, right) => {
            const leftRole = getRoleOrder(left.role);
            const rightRole = getRoleOrder(right.role);

            if (leftRole !== rightRole) {
                return leftRole - rightRole;
            }

            return (left.rank ?? '-').localeCompare(right.rank ?? '-');
        });
    });

    return rows.sort((a, b) => {
        const sportOrder = a.sport.localeCompare(b.sport);

        if (sportOrder !== 0) {
            return sportOrder;
        }

        return a.team.localeCompare(b.team);
    });
}

export default function CoachesIndex({
    coaches,
    filters,
    sports,
    activeCoachCount,
    inactiveCoachCount,
    certificateTypes,
    genders,
}: {
    coaches: PaginatedCoaches;
    filters: Filters;
    sports: SportOption[];
    activeCoachCount: number;
    inactiveCoachCount: number;
    certificateTypes: string[];
    genders: string[];
}) {
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [reportAction, setReportAction] = useState<ReportAction | null>(null);
    const [printOrientation, setPrintOrientation] =
        useState<PrintOrientation>('landscape');
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const teamSportRows = useMemo(
        () => buildCoachTeamSportRows(coaches.data, sports, t),
        [coaches.data, sports, t],
    );
    const activeStatusScope = filters.status_scope ?? 'active';
    const isInactiveTab = activeStatusScope === 'inactive';
    function assignmentFilterFromStatus(
        statusScope: Filters['status_scope'],
    ): string {
        return statusScope === 'inactive' ? 'false' : 'true';
    }

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const nextStatusScope =
                (patch.status_scope as Filters['status_scope']) ??
                activeStatusScope;
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
                has_active_assignment:
                    assignmentFilterFromStatus(nextStatusScope),
            };
            const merged: Filters = { ...current, ...patch };
            merged.has_active_assignment = assignmentFilterFromStatus(
                merged.status_scope ?? nextStatusScope,
            );

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

            router.get(CoachController.index.url(), clean, {
                preserveState: true,
                replace: true,
            });
        },
        [
            query,
            activeStatusScope,
            filters.blood_group,
            filters.coach_status,
            filters.gender,
            filters.has_certification,
            filters.certification_name,
            filters.certification_type,
            filters.sport_id,
            filters.has_active_assignment,
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
                params.append(
                    'filter[has_active_assignment]',
                    assignmentFilterFromStatus(activeStatusScope),
                );
            }
        }

        return exportCoachesUrl.url() + '?' + params.toString();
    }

    function buildPrintUrl(): string {
        const params = new URLSearchParams();
        const printFilters: Filters = {
            q: query || filters.q,
            status_scope: activeStatusScope,
            has_active_assignment:
                assignmentFilterFromStatus(activeStatusScope),
        };

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
        merged.has_active_assignment = assignmentFilterFromStatus(
            merged.status_scope ?? activeStatusScope,
        );
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
        label:
            gender === 'M'
                ? t('Male')
                : gender === 'F'
                  ? t('Female')
                  : gender === 'O'
                    ? t('Other gender')
                    : gender,
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
        setSelectedIds(new Set());
        router.get(
            CoachController.index.url(),
            { 'filter[status_scope]': activeStatusScope },
            { preserveState: false, replace: true },
        );
    }

    return (
        <>
            <Head title={t('Coaches')} />

            <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
                <div className="sticky top-0 z-40 max-w-full min-w-0 space-y-5 overflow-x-hidden bg-card/95 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                                {selectedIds.size > 0
                                    ? t('Export :n selected').replace(
                                          ':n',
                                          String(selectedIds.size),
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

                    <Tabs value={activeStatusScope} className="w-full">
                        <TabsList className="w-auto max-w-full">
                            {STATUS_TABS.map((tab) => {
                                const count =
                                    tab.value === 'active'
                                        ? activeCoachCount
                                        : inactiveCoachCount;

                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        asChild
                                    >
                                        <Link
                                            href={buildIndexUrl({
                                                status_scope: tab.value,
                                            })}
                                            preserveState
                                            replace
                                        >
                                            {t(tab.label)}
                                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                                {count}
                                            </span>
                                        </Link>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>

                    <div className="max-w-full min-w-0 space-y-1.5 rounded-xl border bg-card p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full sm:w-auto sm:max-w-[320px] sm:flex-1">
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

                    <ListingPagination
                        paginator={coaches}
                        itemLabel={t('coaches')}
                        className="sticky top-0 z-40 max-w-full min-w-0 shadow-sm"
                    />
                    <div className="max-w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl border bg-card">
                        <Table className="min-w-[900px] table-fixed border-separate border border-border/60 [&_td]:border-r [&_td]:border-b [&_td]:border-border/45 [&_th]:border-r [&_th]:border-b [&_th]:border-border/45">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[72px] px-2 text-center">
                                        {t('S.No.')}
                                    </TableHead>
                                    {isInactiveTab ? null : (
                                        <TableHead className="w-[140px]">
                                            {t('Sport')}
                                        </TableHead>
                                    )}
                                    {isInactiveTab ? null : (
                                        <TableHead className="w-[180px]">
                                            {t('Team')}
                                        </TableHead>
                                    )}
                                    {isInactiveTab ? (
                                        <>
                                            <TableHead className="w-[120px]">
                                                {t('Rank')}
                                            </TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead className="w-[120px]">
                                                {t('PNO')}
                                            </TableHead>
                                            <TableHead className="w-[130px]">
                                                {t('Mobile')}
                                            </TableHead>
                                            <TableHead className="w-[120px]">
                                                {t('Posting')}
                                            </TableHead>
                                        </>
                                    ) : (
                                        <TableHead className="whitespace-normal">
                                            <div className="space-y-1">
                                                <div>
                                                    {t('Coaches in team')}
                                                </div>
                                                <Table className="w-full table-fixed border-none">
                                                    <colgroup>
                                                        <col className="w-[10%]" />
                                                        <col className="w-[22%]" />
                                                        <col className="w-[13%]" />
                                                        <col className="w-[11%]" />
                                                        <col className="w-[10%]" />
                                                        <col className="w-[12%]" />
                                                        <col className="w-[12%]" />
                                                    </colgroup>
                                                    <TableBody>
                                                        <TableRow className="border-none hover:bg-transparent">
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('Rank')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('Name')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('PNO')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('Mobile')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('Role')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('Posting')}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-[11px] font-medium text-muted-foreground">
                                                                {t('NIS info')}
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isInactiveTab ? (
                                    coaches.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="py-12 text-center text-muted-foreground"
                                            >
                                                {hasActiveFilters
                                                    ? t(
                                                          'No coaches match your filters.',
                                                      )
                                                    : t('No coaches yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        coaches.data.map((coach, index) => {
                                            const serialNumber =
                                                (coaches.from ?? 1) + index;

                                            return (
                                                <TableRow key={coach.id}>
                                                    <TableCell className="px-2 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                                                        {serialNumber}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs">
                                                        {coach.rank_master
                                                            ?.name ??
                                                            coach.rank_master
                                                                ?.short_name ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <Link
                                                            href={CoachController.show.url(
                                                                coach.id,
                                                            )}
                                                            className="text-primary hover:underline"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {coach.full_name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {coach.pno ? (
                                                            <Link
                                                                href={CoachController.show.url(
                                                                    coach.id,
                                                                )}
                                                                className="text-primary hover:underline"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                {coach.pno}
                                                            </Link>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {coach.mobile ?? '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {[
                                                            coach.unit?.name,
                                                            coach.district
                                                                ?.name,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' - ') || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )
                                ) : teamSportRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {hasActiveFilters
                                                ? t(
                                                      'No coaches match your filters.',
                                                  )
                                                : t('No coaches yet.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    teamSportRows.map((row, index) => {
                                        const serialNumber =
                                            (coaches.from ?? 1) + index;

                                        return (
                                            <TableRow
                                                key={`${row.team}-${row.sport}-${index}`}
                                            >
                                                <TableCell className="px-2 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                                                    {serialNumber}
                                                </TableCell>
                                                <TableCell
                                                    className="text-sm break-words whitespace-normal"
                                                    title={row.sport}
                                                >
                                                    {row.sport}
                                                </TableCell>
                                                <TableCell className="text-sm break-words whitespace-normal">
                                                    {row.team}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="w-full">
                                                        <Table className="w-full table-fixed border-none">
                                                            <colgroup>
                                                                <col className="w-[10%]" />
                                                                <col className="w-[22%]" />
                                                                <col className="w-[13%]" />
                                                                <col className="w-[11%]" />
                                                                <col className="w-[10%]" />
                                                                <col className="w-[12%]" />
                                                                <col className="w-[12%]" />
                                                            </colgroup>
                                                            <TableBody>
                                                                {row.coaches.map(
                                                                    (
                                                                        coachInTeam,
                                                                    ) => (
                                                                        <TableRow
                                                                            key={
                                                                                coachInTeam.id
                                                                            }
                                                                        >
                                                                            <TableCell className="w-[10%] py-2 text-xs">
                                                                                {coachInTeam.rank ??
                                                                                    '-'}
                                                                            </TableCell>
                                                                            <TableCell className="w-[22%] py-2 text-sm">
                                                                                <Link
                                                                                    href={CoachController.show.url(
                                                                                        coachInTeam.id,
                                                                                    )}
                                                                                    className="text-primary hover:underline"
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    {
                                                                                        coachInTeam.full_name
                                                                                    }
                                                                                </Link>
                                                                            </TableCell>
                                                                            <TableCell className="w-[13%] py-2 text-sm">
                                                                                {coachInTeam.pno ? (
                                                                                    <Link
                                                                                        href={CoachController.show.url(
                                                                                            coachInTeam.id,
                                                                                        )}
                                                                                        className="text-primary hover:underline"
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                    >
                                                                                        {
                                                                                            coachInTeam.pno
                                                                                        }
                                                                                    </Link>
                                                                                ) : (
                                                                                    '-'
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="w-[11%] py-2 text-sm">
                                                                                {coachInTeam.mobile ??
                                                                                    '-'}
                                                                            </TableCell>
                                                                            <TableCell className="w-[10%] py-2 text-xs">
                                                                                {
                                                                                    coachInTeam.role
                                                                                }
                                                                            </TableCell>
                                                                            <TableCell className="w-[12%] py-2 text-xs">
                                                                                {coachInTeam.posting ||
                                                                                    '-'}
                                                                            </TableCell>
                                                                            <TableCell className="w-[12%] py-2 text-xs">
                                                                                {coachInTeam.nis_master_name ||
                                                                                    '—'}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ),
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
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
    selectedIds: Set<number>;
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
                            : selectedIds.size > 0
                              ? t('Exporting :n selected coaches.').replace(
                                    ':n',
                                    String(selectedIds.size),
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
