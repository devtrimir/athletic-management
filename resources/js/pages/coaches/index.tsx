import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Download,
    Eye,
    Info,
    Plus,
    Printer,
    Search,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { index as exportCoachesUrl } from '@/actions/App/Http/Controllers/CoachExportController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import Heading from '@/components/heading';
import { ListingPagination } from '@/components/listing-pagination';
import { CoachQuickView } from '@/components/teams/coach-quick-view';
import { Badge } from '@/components/ui/badge';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

const ALL_COLUMNS = [
    { key: 'serial_number', label: 'S.No.' },
    { key: 'full_name', label: 'Name' },
    { key: 'pno', label: 'PNO' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'gender', label: 'Gender' },
    { key: 'sports', label: 'Playable sport' },
    { key: 'unit_district', label: 'Posting' },
    { key: 'mobile', label: 'Mobile number' },
    { key: 'nis_certified', label: 'NIS Certified' },
] as const;

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Coach = {
    id: number;
    full_name: string;
    pno: string | null;
    designation: string | null;
    blood_group?: string | null;
    gender?: string | null;
    mobile: string | null;
    email: string | null;
    coach_status: string | null;
    nis_certified: boolean;
    rank_master?: {
        id: number;
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
            location_label?: string | null;
            session?: {
                id: number;
                name: string;
            } | null;
        } | null;
    }[];
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
    nis_certified?: string;
    blood_group?: string;
    district_id?: string;
    unit_id?: string;
    coach_status?: string;
    designation?: string;
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

function CoachSportCell({ coach }: { coach: Coach }) {
    const { t } = useTranslation();
    const playableSports = coach.sports ?? [];

    if (playableSports.length === 0) {
        return (
            <span className="text-sm text-muted-foreground">
                {t('Not added')}
            </span>
        );
    }

    return (
        <div className="w-full min-w-[420px] overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        {playableSports.length > 1 && (
                            <TableHead className="w-14 py-2 text-center text-xs">
                                {t('S. No.')}
                            </TableHead>
                        )}
                        <TableHead className="py-2 text-xs">
                            {t('Sport')}
                        </TableHead>
                        <TableHead className="py-2 text-xs">
                            {t('Event')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {playableSports.map((sport, index) => (
                        <TableRow key={sport.id}>
                            {playableSports.length > 1 && (
                                <TableCell className="py-2 text-center text-xs text-muted-foreground">
                                    {index + 1}
                                </TableCell>
                            )}
                            <TableCell className="py-2 text-xs font-medium">
                                {sport.name}
                            </TableCell>
                            <TableCell className="py-2 text-xs">
                                {displayValue(
                                    sport.sport_event ??
                                        sport.pivot?.sport_event,
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function displayValue(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === ''
        ? ''
        : String(value);
}

function formatDate(value: string | null | undefined): string {
    return value ? value.trim().split('T')[0] : '';
}

function coachRankLabel(coach: Coach): string {
    return (
        coach.rank_master?.short_name ??
        coach.rank_master?.name ??
        coach.rank_master?.code ??
        coach.designation ??
        ''
    );
}

export default function CoachesIndex({
    coaches,
    filters,
    sports,
    districts,
    units,
    activeCoachCount,
    inactiveCoachCount,
    certificateTypes,
    coachStatuses,
    genders,
}: {
    coaches: PaginatedCoaches;
    filters: Filters;
    sports: SportOption[];
    districts: { id: number; name: string }[];
    units: { id: number; name: string; district_id: number | null }[];
    activeCoachCount: number;
    inactiveCoachCount: number;
    certificateTypes: string[];
    coachStatuses: string[];
    genders: string[];
}) {
    const { t } = useTranslation();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );
    const [quickViewId, setQuickViewId] = useState<number | null>(null);

    const [query, setQuery] = useState(filters.q ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeStatusScope = filters.status_scope ?? 'active';

    const applyFilters = useCallback(
        (patch: Partial<Filters>) => {
            const current: Filters = {
                status_scope: activeStatusScope,
                q: query || undefined,
                nis_certified: filters.nis_certified,
                blood_group: filters.blood_group,
                district_id: filters.district_id,
                unit_id: filters.unit_id,
                coach_status: filters.coach_status,
                gender: filters.gender,
                has_certification: filters.has_certification,
                certification_name: filters.certification_name,
                certification_type: filters.certification_type,
                sport_id: filters.sport_id,
                has_active_assignment: filters.has_active_assignment,
            };
            const merged: Filters = { ...current, ...patch };

            const clean: Record<string, string> = {};

            if (merged.q) {
                clean['filter[q]'] = merged.q;
            }

            if (merged.status_scope) {
                clean['filter[status_scope]'] = merged.status_scope;
            }

            if (merged.nis_certified) {
                clean['filter[nis_certified]'] = merged.nis_certified;
            }

            if (merged.blood_group) {
                clean['filter[blood_group]'] = merged.blood_group;
            }

            if (merged.district_id) {
                clean['filter[district_id]'] = merged.district_id;
            }

            if (merged.unit_id) {
                clean['filter[unit_id]'] = merged.unit_id;
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
            filters.nis_certified,
            filters.blood_group,
            filters.district_id,
            filters.unit_id,
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

    function genderLabel(value: string | null | undefined): string {
        switch (value) {
            case 'M':
                return t('Male');
            case 'F':
                return t('Female');
            case 'O':
                return t('Other gender');
            default:
                return value ?? '';
        }
    }

    function coachLocation(coach: Coach): string | null {
        return coach.unit?.name ?? coach.district?.name ?? null;
    }

    function exportValue(
        coach: Coach,
        key: string,
        serialNumber: number,
    ): string {
        if (key === 'serial_number') {
            return String(serialNumber);
        }

        if (key === 'nis_certified') {
            return coach.nis_certified ? t('NIS Certified') : '';
        }

        if (key === 'gender') {
            return genderLabel(coach.gender);
        }

        if (key === 'sports') {
            return (coach.sports ?? []).map((sport) => sport.name).join(', ');
        }

        if (key === 'unit_district') {
            return coachLocation(coach) ?? '';
        }

        const raw = (coach as Record<string, unknown>)[key];

        return raw === null || raw === '' || raw === undefined
            ? ''
            : String(raw);
    }

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

            params.append('filter[status_scope]', activeStatusScope);

            if (filters.nis_certified) {
                params.append('filter[nis_certified]', filters.nis_certified);
            }

            if (filters.blood_group) {
                params.append('filter[blood_group]', filters.blood_group);
            }

            if (filters.district_id) {
                params.append('filter[district_id]', filters.district_id);
            }

            if (filters.unit_id) {
                params.append('filter[unit_id]', filters.unit_id);
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

            if (filters.has_active_assignment) {
                params.append(
                    'filter[has_active_assignment]',
                    filters.has_active_assignment,
                );
            }
        }

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportCoachesUrl.url() + '?' + params.toString();
    }

    function buildIndexUrl(patch: Partial<Filters> = {}): string {
        const merged: Filters = {
            ...filters,
            status_scope: activeStatusScope,
            q: query || undefined,
            ...patch,
        };
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
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const headers = cols.map((c) => `<th>${t(c.label)}</th>`).join('');
        const bodyRows = coaches.data
            .map(
                (coach, index) =>
                    `<tr>${cols.map((c) => `<td>${exportValue(coach, c.key, (coaches.from ?? 1) + index)}</td>`).join('')}</tr>`,
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

    const hasActiveFilters = !!(
        filters.q ||
        filters.nis_certified ||
        filters.blood_group ||
        filters.district_id ||
        filters.unit_id ||
        filters.coach_status ||
        filters.gender ||
        filters.has_certification ||
        filters.certification_name ||
        filters.certification_type ||
        filters.sport_id ||
        filters.has_active_assignment
    );

    const nisOptions = [
        { value: '1', label: t('NIS certified') },
        { value: '0', label: t('Not NIS certified') },
    ];
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
    const statusOptions = coachStatuses.map((status) => ({
        value: status,
        label: t(status),
    }));
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
    const districtOptions = districts.map((district) => ({
        value: String(district.id),
        label: district.name,
    }));
    const unitOptions = units.map((unit) => ({
        value: String(unit.id),
        label: unit.name,
    }));
    const assignmentOptions = [
        { value: 'true', label: t('Has active assignment') },
        { value: 'false', label: t('No active assignment') },
    ];
    const activeFilterCount = [
        filters.nis_certified,
        filters.coach_status,
        filters.designation,
        filters.email,
        filters.gender,
        filters.has_certification,
        filters.certification_name,
        filters.certification_type,
        filters.sport_id,
        filters.has_active_assignment,
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
                                onClick={() => setExportOpen(true)}
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

                    <div className="max-w-full min-w-0 space-y-3 rounded-xl border bg-card p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={t('Search coaches…')}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {activeFilterCount > 0 && (
                                    <span>
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
                                        className="h-8 px-2"
                                    >
                                        <X className="mr-1.5 h-4 w-4" />
                                        {t('Clear filters')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <FilterPill
                                label={t('NIS')}
                                activeLabel={optionLabel(
                                    nisOptions,
                                    filters.nis_certified,
                                )}
                                onClear={() =>
                                    applyFilters({ nis_certified: undefined })
                                }
                            >
                                <OptionList
                                    options={nisOptions}
                                    value={filters.nis_certified}
                                    onSelect={(value) =>
                                        applyFilters({ nis_certified: value })
                                    }
                                />
                            </FilterPill>

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
                                label={t('District')}
                                activeLabel={optionLabel(
                                    districtOptions,
                                    filters.district_id,
                                )}
                                onClear={() =>
                                    applyFilters({ district_id: undefined })
                                }
                            >
                                <SearchableOptionList
                                    options={districtOptions}
                                    value={filters.district_id}
                                    onSelect={(value) =>
                                        applyFilters({ district_id: value })
                                    }
                                    searchPlaceholder={t('Search districts…')}
                                />
                            </FilterPill>

                            <FilterPill
                                label={t('Unit')}
                                activeLabel={optionLabel(
                                    unitOptions,
                                    filters.unit_id,
                                )}
                                onClear={() =>
                                    applyFilters({ unit_id: undefined })
                                }
                            >
                                <SearchableOptionList
                                    options={unitOptions}
                                    value={filters.unit_id}
                                    onSelect={(value) =>
                                        applyFilters({ unit_id: value })
                                    }
                                    searchPlaceholder={t('Search units…')}
                                />
                            </FilterPill>

                            <FilterPill
                                label={t('Status')}
                                activeLabel={optionLabel(
                                    statusOptions,
                                    filters.coach_status,
                                )}
                                onClear={() =>
                                    applyFilters({ coach_status: undefined })
                                }
                            >
                                <OptionList
                                    options={statusOptions}
                                    value={filters.coach_status}
                                    onSelect={(value) =>
                                        applyFilters({ coach_status: value })
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
                                        placeholder={t('Certification name')}
                                        value={filters.certification_name ?? ''}
                                        onChange={(e) =>
                                            applyFilters({
                                                certification_name:
                                                    e.target.value || undefined,
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
                    </div>

                    <ListingPagination
                        paginator={coaches}
                        itemLabel={t('coaches')}
                        className="sticky top-0 z-40 max-w-full min-w-0 shadow-sm"
                    />
                    <div className="max-w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl border bg-card">
                        <Table className="min-w-[1500px] table-fixed border-separate border border-border/60 [&_td]:border-r [&_td]:border-b [&_td]:border-border/45 [&_th]:border-r [&_th]:border-b [&_th]:border-border/45">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="sticky left-0 z-40 w-[56px] max-w-[56px] min-w-[56px] bg-card px-2">
                                        <Checkbox
                                            checked={
                                                coaches.data.length > 0 &&
                                                coaches.data.every((c) =>
                                                    selectedIds.has(c.id),
                                                )
                                                    ? true
                                                    : coaches.data.some((c) =>
                                                            selectedIds.has(
                                                                c.id,
                                                            ),
                                                        )
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            onCheckedChange={togglePage}
                                            aria-label={t('Select all on page')}
                                        />
                                    </TableHead>
                                    <TableHead className="sticky left-[56px] z-30 w-[72px] max-w-[72px] min-w-[72px] bg-card px-2 text-center">
                                        {t('S.No.')}
                                    </TableHead>
                                    <TableHead className="w-[280px]">
                                        {t('Coach')}
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        {t('Blood group')}
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        {t('Gender')}
                                    </TableHead>
                                    <TableHead className="w-[440px]">
                                        {t('Playable sport')}
                                    </TableHead>
                                    <TableHead className="w-[520px]">
                                        {t('Current team names')}
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        {t('Posting')}
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        {t('Mobile number')}
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        {t('NIS certified')}
                                    </TableHead>
                                    <TableHead className="sticky right-0 z-20 w-[96px] bg-background text-right">
                                        {t('Actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coaches.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={11}
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
                                        const assignments =
                                            coach.current_assignments ?? [];

                                        return (
                                            <TableRow
                                                key={coach.id}
                                                className="group cursor-pointer transition-colors hover:bg-muted/30"
                                                onClick={() =>
                                                    setQuickViewId(coach.id)
                                                }
                                            >
                                                <TableCell className="sticky left-0 z-40 w-[56px] max-w-[56px] min-w-[56px] bg-card px-2 group-hover:bg-muted/30">
                                                    <Checkbox
                                                        checked={selectedIds.has(
                                                            coach.id,
                                                        )}
                                                        onCheckedChange={() =>
                                                            toggleRow(coach.id)
                                                        }
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                        aria-label={t(
                                                            'Select row',
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="sticky left-[56px] z-30 w-[72px] max-w-[72px] min-w-[72px] bg-card px-2 text-center text-sm font-semibold text-muted-foreground tabular-nums group-hover:bg-muted/30">
                                                    {serialNumber}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="min-w-0 space-y-2">
                                                        <div className="flex min-w-0 items-start gap-2">
                                                            {coachRankLabel(
                                                                coach,
                                                            ) ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px]"
                                                                >
                                                                    {coachRankLabel(
                                                                        coach,
                                                                    )}
                                                                </Badge>
                                                            ) : null}
                                                            <Link
                                                                href={CoachController.show.url(
                                                                    coach.id,
                                                                )}
                                                                onClick={(
                                                                    event,
                                                                ) =>
                                                                    event.stopPropagation()
                                                                }
                                                                className="min-w-0 truncate font-semibold text-foreground hover:underline"
                                                            >
                                                                {
                                                                    coach.full_name
                                                                }
                                                            </Link>
                                                        </div>
                                                        {coach.pno ? (
                                                            <div className="text-xs text-muted-foreground">
                                                                <span className="font-medium">
                                                                    {t('PNO')}:
                                                                </span>
                                                                <span className="ml-1">
                                                                    {
                                                                        coach.pno
                                                                    }
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden text-muted-foreground md:table-cell">
                                                    {coach.blood_group ? (
                                                        <span>
                                                            {coach.blood_group}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="hidden text-muted-foreground lg:table-cell">
                                                    {coach.gender ? (
                                                        <span>
                                                            {genderLabel(
                                                                coach.gender,
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="min-w-0">
                                                    <CoachSportCell
                                                        coach={coach}
                                                    />
                                                </TableCell>
                                                <TableCell
                                                    className="align-top"
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    {assignments.length > 0 ? (
                                                        <div className="w-full min-w-[500px] overflow-hidden rounded-md border">
                                                            <Table>
                                                                <TableHeader className="bg-muted/50">
                                                                    <TableRow>
                                                                        {assignments.length >
                                                                            1 && (
                                                                            <TableHead className="w-14 py-2 text-center text-xs">
                                                                                {t(
                                                                                    'S. No.',
                                                                                )}
                                                                            </TableHead>
                                                                        )}
                                                                        <TableHead className="py-2 text-xs">
                                                                            {t(
                                                                                'Team',
                                                                            )}
                                                                        </TableHead>
                                                                        <TableHead className="py-2 text-xs">
                                                                            {t(
                                                                                'Session',
                                                                            )}
                                                                        </TableHead>
                                                                        <TableHead className="py-2 text-xs">
                                                                            {t(
                                                                                'Role',
                                                                            )}
                                                                        </TableHead>
                                                                        <TableHead className="py-2 text-xs">
                                                                            {t(
                                                                                'Assigned at',
                                                                            )}
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {assignments.map(
                                                                        (
                                                                            assignment,
                                                                            teamIndex,
                                                                        ) => (
                                                                            <TableRow
                                                                                key={
                                                                                    assignment.id
                                                                                }
                                                                            >
                                                                                {assignments.length >
                                                                                    1 && (
                                                                                    <TableCell className="py-2 text-center text-xs text-muted-foreground">
                                                                                        {teamIndex +
                                                                                            1}
                                                                                    </TableCell>
                                                                                )}
                                                                                <TableCell className="py-2 text-xs">
                                                                                    {assignment
                                                                                        .team
                                                                                        ?.id ? (
                                                                                        <a
                                                                                            href={TeamController.show.url(
                                                                                                assignment
                                                                                                    .team
                                                                                                    .id,
                                                                                            )}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="font-medium hover:underline"
                                                                                        >
                                                                                            {displayValue(
                                                                                                assignment
                                                                                                    .team
                                                                                                    ?.name,
                                                                                            )}
                                                                                        </a>
                                                                                    ) : (
                                                                                        displayValue(
                                                                                            assignment
                                                                                                .team
                                                                                                ?.name,
                                                                                        )
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="py-2 text-xs">
                                                                                    {displayValue(
                                                                                        assignment
                                                                                            .session
                                                                                            ?.name ??
                                                                                            assignment
                                                                                                .team
                                                                                                ?.session
                                                                                                ?.name,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="py-2 text-xs">
                                                                                    {displayValue(
                                                                                        assignment.role,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="py-2 text-xs">
                                                                                    {formatDate(
                                                                                        assignment.assigned_at,
                                                                                    ) ||
                                                                                        t(
                                                                                            'Not assigned',
                                                                                        )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ),
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            {t(
                                                                'Not assigned',
                                                            )}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-0">
                                                    {coachLocation(coach) ? (
                                                        <span className="block truncate text-muted-foreground">
                                                            {coachLocation(
                                                                coach,
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div className="min-w-0 text-sm">
                                                        {coach.mobile ? (
                                                            <span className="block truncate font-medium">
                                                                {coach.mobile}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {coach.nis_certified ? (
                                                        <div className="flex min-w-0 flex-wrap gap-1.5">
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                                {t(
                                                                    'NIS certified',
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="sticky right-0 z-10 w-[96px] bg-background text-right group-hover:bg-muted/30">
                                                    <div className="flex items-center justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={t(
                                                                'Quick info',
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setQuickViewId(
                                                                    coach.id,
                                                                );
                                                            }}
                                                        >
                                                            <Info className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={t('View')}
                                                            asChild
                                                        >
                                                            <Link
                                                                href={CoachController.show.url(
                                                                    coach.id,
                                                                )}
                                                                onClick={(
                                                                    event,
                                                                ) =>
                                                                    event.stopPropagation()
                                                                }
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
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
                    <p className="mb-3 text-sm font-medium">
                        {t('Select columns to export')}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ALL_COLUMNS.map((col) => (
                            <div
                                key={col.key}
                                className="flex items-center gap-2"
                            >
                                <Checkbox
                                    id={`col-${col.key}`}
                                    checked={selectedColumns.includes(col.key)}
                                    onCheckedChange={(checked) =>
                                        setSelectedColumns((prev) =>
                                            checked
                                                ? prev.includes(col.key)
                                                    ? prev
                                                    : [...prev, col.key]
                                                : prev.filter(
                                                      (k) => k !== col.key,
                                                  ),
                                        )
                                    }
                                />
                                <Label htmlFor={`col-${col.key}`}>
                                    {t(col.label)}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
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
