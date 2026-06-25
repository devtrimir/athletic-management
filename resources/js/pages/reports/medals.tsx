import { Head, setLayoutProps, useHttp } from '@inertiajs/react';
import { Check, ChevronDown, Download, Printer, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import MedalsDetailController from '@/actions/App/Http/Controllers/Api/V1/MedalsDetailController';
import MedalsPivotController from '@/actions/App/Http/Controllers/Api/V1/MedalsPivotController';
import MedalsExportController from '@/actions/App/Http/Controllers/MedalsExportController';
import Heading from '@/components/heading';
import { OptionMultiSelect } from '@/components/option-multi-select';
import type { MultiSelectOption } from '@/components/option-multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

// ── Types ─────────────────────────────────────────────────────────────────────

type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label_hi: string; label_en: string };
type Unit = { id: number; name: string };
type Session = { id: number; name: string; is_current: boolean };
type District = { id: number; name: string };
type RankOption = { code: string; name: string; short_name: string | null };
type DesignationOption = { code: string; name: string; short_name: string | null };
type TournamentOption = { id: number; session_id: number | null; name: string; date_from: string | null };
type EventOption = { id: number; tournament_id: number; name: string };

type PivotRow = {
    tier: { code: string; label: string; weight: number };
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
    display_only: number;
};

type TeamPivotRow = {
    team: {
        id: number;
        name: string;
        sport_name: string | null;
        session_name: string | null;
        unit_name: string | null;
        district_name: string | null;
    };
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
    display_only: number;
    events: number;
    players: number;
};

type PivotResponse = {
    data: PivotRow[] | TeamPivotRow[];
    filters: Record<string, unknown>;
    group_by: 'tier' | 'team';
};

type Benefit = {
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

type MedalRow = {
    id: number;
    medal_type: 'GOLD' | 'SILVER' | 'BRONZE' | 'MERIT';
    position: number | null;
    remarks: string | null;
    member: {
        id: number;
        member_code: string;
        pno: string | null;
        full_name: string;
        rank: string | null;
        gender: string;
        unit_name: string | null;
    };
    tournament: {
        id: number;
        name: string;
        venue: string | null;
        date_from: string | null;
        date_to: string | null;
        tier_code: string | null;
        tier_label: string | null;
    };
    session_name: string | null;
    sport: { id: number; name: string };
    event: {
        id: number;
        name: string;
        discipline: string | null;
        weight_category: string | null;
        gender_class: string | null;
    };
    benefit: Benefit | null;
};

type MedalCounts = {
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
};

type DetailResponse = {
    data: MedalRow[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number | null;
    to: number | null;
    medal_counts: MedalCounts;
};

type Filters = {
    year_from: string;
    year_to: string;
    date_from: string;
    date_to: string;
    session_ids: string[];
    sport_ids: string[];
    tier_ids: string[];
    unit_ids: string[];
    district_ids: string[];
    rank_codes: string[];
    designations: string[];
    player_categories: string[];
    player_levels: string[];
    statuses: string[];
    tournament_ids: string[];
    tournament_name: string;
    venue: string;
    event_name: string;
    event_ids: string[];
    disciplines: string[];
    weight_categories: string[];
    event_gender_classes: string[];
    medal_types: string[];
    genders: string[];
    position_from: string;
    position_to: string;
    has_remarks: string;
    benefit_types: string[];
    benefit_date_from: string;
    benefit_date_to: string;
    order_reference: string;
};

const ALL = 'all';

const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const;
const GENDER_OPTIONS = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other gender' },
] as const;
const PER_PAGE_OPTIONS = [15, 25, 50, 100] as const;
const PLAYER_CATEGORY_OPTIONS = ['GD', 'SPORTS_QUOTA'] as const;
const PLAYER_LEVEL_OPTIONS = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'] as const;
const STATUS_OPTIONS = ['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'] as const;
const EVENT_GENDER_CLASS_OPTIONS = ['M', 'F', 'MIXED', 'OPEN'] as const;
const BENEFIT_TYPE_OPTIONS = ['PROMOTION', 'OUT_OF_TURN_PROMOTION', 'CASH_AWARD', 'COMMENDATION', 'NONE', 'OTHER'] as const;

function parseDateValue(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string | null | undefined, locale = 'hi'): string | null {
    const date = parseDateValue(value);

    if (!date) {
        return null;
    }

    return new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : 'hi-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function formatDateRange(from: string | null | undefined, to: string | null | undefined, locale = 'hi'): string | null {
    const formattedFrom = formatDisplayDate(from, locale);
    const formattedTo = formatDisplayDate(to, locale);

    if (formattedFrom && formattedTo) {
        return formattedFrom === formattedTo ? formattedFrom : `${formattedFrom} – ${formattedTo}`;
    }

    return formattedFrom ?? formattedTo;
}

// ── Medal badge ───────────────────────────────────────────────────────────────

function medalColor(type: string): string {
    return {
        GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        SILVER: 'bg-slate-100 text-slate-700 border-slate-300',
        BRONZE: 'bg-orange-100 text-orange-800 border-orange-300',
        MERIT: 'bg-blue-50 text-blue-700 border-blue-200',
    }[type] ?? 'bg-muted text-muted-foreground border-border';
}

function MedalBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'lg' }) {
    const { t } = useTranslation();

    return (
        <span
            className={[
                'inline-flex items-center rounded-full border font-semibold',
                size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
                medalColor(type),
            ].join(' ')}
        >
            {t(type)}
        </span>
    );
}

function CountCell({ value, strong = false }: { value: number; strong?: boolean }) {
    return (
        <span
            className={[
                'inline-flex min-w-8 justify-center rounded-md px-2 py-1 font-mono text-sm tabular-nums',
                strong ? 'bg-foreground text-background font-bold' : value > 0 ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground',
            ].join(' ')}
        >
            {value}
        </span>
    );
}

function DisplayOnlyCell({ value }: { value: number }) {
    return (
        <span
            className={[
                'inline-flex min-w-8 justify-center rounded-md border px-2 py-1 font-mono text-sm tabular-nums',
                value > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-transparent text-muted-foreground',
            ].join(' ')}
        >
            {value}
        </span>
    );
}

// ── FilterPill ────────────────────────────────────────────────────────────────

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
                            <span className="max-w-28 truncate font-semibold">{activeLabel}</span>
                            <span
                                role="button"
                                tabIndex={0}
                                className="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                                onClick={(e) => {
 e.stopPropagation(); onClear(); setOpen(false);
}}
                                onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.stopPropagation(); onClear(); setOpen(false);
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

function OptionList({ options, value, onSelect }: {
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
}) {
    return (
        <div className="flex flex-col py-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() => onSelect(value === opt.value ? ALL : opt.value)}
                >
                    <Check className={['size-3.5 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0'].join(' ')} />
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ── Print orientation dialog ──────────────────────────────────────────────────

function PrintDialog({ open, onOpenChange, onPrint }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onPrint: (orientation: 'portrait' | 'landscape') => void;
}) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Page orientation')}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">{t('Choose the print orientation for the report.')}</p>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button className="w-full" onClick={() => {
 onPrint('portrait'); onOpenChange(false);
}}>
                        {t('Portrait')} (A4)
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => {
 onPrint('landscape'); onOpenChange(false);
}}>
                        {t('Landscape')} (A4)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Detail row modal ──────────────────────────────────────────────────────────

// ── Sub-modal: Related Medals ─────────────────────────────────────────────────

type RelatedResponse = { data: MedalRow[]; total: number; per_page: number };

function exportRelatedCsv(rows: MedalRow[], filename: string): void {
    const header = ['Medal', 'Name', 'PNO', 'Rank', 'Unit', 'Sport', 'Event', 'Tournament', 'Date'].join(',');
    const body = rows.map((r) => [
        r.medal_type,
        r.member.full_name,
        r.member.pno ?? '',
        r.member.rank ?? '',
        r.member.unit_name ?? '',
        r.sport.name,
        r.event.name,
        r.tournament.name,
        formatDisplayDate(r.tournament.date_from) ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const csv = '\uFEFF' + header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printRelated(rows: MedalRow[], title: string): void {
    const win = window.open('', '_blank', 'width=1000,height=700');

    if (!win) {
 return;
}

    const MEDAL_COLOR: Record<string, string> = {
        GOLD: '#ca8a04',
        SILVER: '#64748b',
        BRONZE: '#c2410c',
        MERIT: '#2563eb',
    };

    const tableRows = rows.map((r) => `
        <tr>
            <td style="color:${MEDAL_COLOR[r.medal_type] ?? '#000'};font-weight:600">${r.medal_type}</td>
            <td>${r.member.full_name}</td>
            <td>${r.member.pno ?? ''}</td>
            <td>${r.member.rank ?? ''}</td>
            <td>${r.member.unit_name ?? ''}</td>
            <td>${r.sport.name}</td>
            <td>${r.event.name}</td>
            <td>${r.tournament.name}</td>
            <td>${formatDisplayDate(r.tournament.date_from) ?? ''}</td>
        </tr>`).join('');

    win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            h2 { font-size: 15px; margin-bottom: 4px; }
            p.sub { color: #666; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; border-bottom: 2px solid #d1d5db; }
            td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) td { background: #f9fafb; }
            @media print { body { margin: 0; } }
        </style>
    </head><body>
        <h2>${title}</h2>
        <p class="sub">Printed: ${new Intl.DateTimeFormat('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</p>
        <table>
            <thead><tr>
                <th>Medal</th><th>Name</th><th>PNO</th><th>Rank</th><th>Unit</th>
                <th>Sport</th><th>Event</th><th>Tournament</th><th>Date</th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
}

function RelatedMedalsModal({
    title,
    description,
    params,
    open,
    onOpenChange,
}: {
    title: string;
    description: string;
    params: Record<string, string>;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const { t } = useTranslation();
    const [relatedData, setRelatedData] = useState<RelatedResponse | null>(null);
    const { get: fetchRows, processing } = useHttp<Record<string, never>, RelatedResponse>({});

    useEffect(() => {
        if (!open) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRelatedData(null);
        fetchRows(
            MedalsDetailController.url({ query: { ...params, per_page: '50' } }),
            { onSuccess: (res) => setRelatedData(res) },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const rows = relatedData?.data ?? [];
    const total = relatedData?.total ?? 0;
    const hasRows = !processing && rows.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden" aria-describedby="related-desc">
                <DialogHeader className="px-5 pt-5 pb-3 border-b">
                    <DialogTitle className="text-base">{title}</DialogTitle>
                    <DialogDescription id="related-desc" className="text-xs">{description}</DialogDescription>
                </DialogHeader>

                <div className="max-h-[55vh] overflow-y-auto p-4">
                    {processing && (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    )}
                    {!processing && rows.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted-foreground">{t('No results')}</p>
                    )}
                    {hasRows && (
                        <>
                            {total > 50 && (
                                <p className="mb-2 text-xs text-muted-foreground">
                                    {t('Showing first 50 of')} {total}
                                </p>
                            )}
                            <div className="divide-y rounded-lg border overflow-hidden">
                                {rows.map((r) => (
                                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/40">
                                        <MedalBadge type={r.medal_type} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">{r.member.full_name}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {[r.sport.name, r.event.name].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {r.member.unit_name && (
                                                <div className="text-xs text-muted-foreground">{r.member.unit_name}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {hasRows && (
                    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 bg-muted/30">
                        <span className="text-xs text-muted-foreground">
                            {rows.length}{total > rows.length ? ` / ${total}` : ''} {t('records')}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => exportRelatedCsv(rows, title)}
                            >
                                <Download className="size-3.5" />
                                {t('Export CSV')}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => printRelated(rows, title)}
                            >
                                <Printer className="size-3.5" />
                                {t('Print / PDF')}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
                {action}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-4 text-sm">
                {children}
            </div>
        </div>
    );
}

function DetailRow({ label, value, full }: { label: string; value: string | null | undefined; full?: boolean }) {
    if (!value) {
 return null;
}

    return (
        <div className={full ? 'col-span-2 flex flex-col gap-0.5' : 'flex flex-col gap-0.5'}>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="font-medium leading-snug break-words">{value}</span>
        </div>
    );
}

function MedalDetailModal({ row, open, onOpenChange }: {
    row: MedalRow | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const { t } = useTranslation();
    const [subModal, setSubModal] = useState<'tournament' | 'event' | 'athlete' | null>(null);

    if (!row) {
 return null;
}

    const dateRange = formatDateRange(row.tournament.date_from, row.tournament.date_to);
    const genderLabel = GENDER_OPTIONS.find((g) => g.value === row.member.gender)?.label;

    const viewAllBtn = (onClick: () => void, label: string) => (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
            <Users className="size-3" />
            {label}
        </button>
    );

    return (
        <>
        {/* Sub-modals */}
        <RelatedMedalsModal
            open={subModal === 'tournament'}
            onOpenChange={(v) => setSubModal(v ? 'tournament' : null)}
            title={row.tournament.name}
            description={t('All medal records from this tournament')}
            params={{ tournament_id: String(row.tournament.id) }}
        />
        <RelatedMedalsModal
            open={subModal === 'event'}
            onOpenChange={(v) => setSubModal(v ? 'event' : null)}
            title={[row.sport.name, row.event.name].filter(Boolean).join(' – ')}
            description={t('All medal records for this event')}
            params={{ tournament_id: String(row.tournament.id), event_id: String(row.event.id) }}
        />
        {row.member.pno && (
            <RelatedMedalsModal
                open={subModal === 'athlete'}
                onOpenChange={(v) => setSubModal(v ? 'athlete' : null)}
                title={row.member.full_name}
                description={t('All medal records for this athlete')}
                params={{ pno: row.member.pno }}
            />
        )}
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden" aria-describedby={undefined}>
                {/* ── Hero strip ── */}
                <div className={[
                    'flex items-center gap-4 px-6 py-4 border-b',
                    row.medal_type === 'GOLD'   ? 'bg-yellow-50'  : '',
                    row.medal_type === 'SILVER' ? 'bg-slate-50'   : '',
                    row.medal_type === 'BRONZE' ? 'bg-orange-50'  : '',
                    row.medal_type === 'MERIT'  ? 'bg-blue-50'    : '',
                ].filter(Boolean).join(' ')}>
                    <div className={[
                        'flex size-14 shrink-0 items-center justify-center rounded-full text-2xl border-2',
                        row.medal_type === 'GOLD'   ? 'border-yellow-300 bg-yellow-100 text-yellow-700' : '',
                        row.medal_type === 'SILVER' ? 'border-slate-300 bg-slate-100 text-slate-600'    : '',
                        row.medal_type === 'BRONZE' ? 'border-orange-300 bg-orange-100 text-orange-700' : '',
                        row.medal_type === 'MERIT'  ? 'border-blue-200 bg-blue-50 text-blue-600'        : '',
                    ].filter(Boolean).join(' ')}>
                        {row.medal_type === 'GOLD' ? '🥇' : row.medal_type === 'SILVER' ? '🥈' : row.medal_type === 'BRONZE' ? '🥉' : '🏅'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold leading-tight">{row.member.full_name}</h2>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {row.member.member_code && <span>{row.member.member_code}</span>}
                            {row.member.pno && <span>PNO: {row.member.pno}</span>}
                            {row.member.rank && <span>{row.member.rank}</span>}
                            {row.member.unit_name && <span>{row.member.unit_name}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <MedalBadge type={row.medal_type} />
                            {row.tournament.tier_label && (
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-background">
                                    {row.tournament.tier_label}
                                </span>
                            )}
                            {row.session_name && (
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-background">
                                    {row.session_name}
                                </span>
                            )}
                        </div>
                    </div>
                    <DialogHeader className="sr-only">
                        <DialogTitle>{row.member.full_name}</DialogTitle>
                    </DialogHeader>
                </div>

                {/* ── Scrollable body ── */}
                <div className="max-h-[60vh] overflow-y-auto space-y-3 p-4">
                    {/* Competition */}
                    <SectionCard
                        title={t('Competition')}
                        action={viewAllBtn(() => setSubModal('tournament'), t('All in tournament'))}
                    >
                        <DetailRow label={t('Tournament')} value={row.tournament.name} full />
                        <DetailRow label={t('Venue')} value={row.tournament.venue} full />
                        <DetailRow label={t('Tier')} value={row.tournament.tier_label} />
                        <DetailRow label={t('Session')} value={row.session_name} />
                        <DetailRow label={t('Dates')} value={dateRange || null} />
                    </SectionCard>

                    {/* Event */}
                    <SectionCard
                        title={t('Event')}
                        action={viewAllBtn(() => setSubModal('event'), t('All in event'))}
                    >
                        <DetailRow label={t('Sport')} value={row.sport.name} />
                        <DetailRow label={t('Event')} value={row.event.name} />
                        {row.event.discipline && <DetailRow label={t('Discipline')} value={row.event.discipline} />}
                        {row.event.weight_category && <DetailRow label={t('Weight category')} value={row.event.weight_category} />}
                        {row.event.gender_class && <DetailRow label={t('Gender class')} value={row.event.gender_class} />}
                    </SectionCard>

                    {/* Athlete */}
                    <SectionCard
                        title={t('Athlete')}
                        action={row.member.pno ? viewAllBtn(() => setSubModal('athlete'), t('All medals')) : undefined}
                    >
                        <DetailRow label={t('Member code')} value={row.member.member_code} />
                        <DetailRow label={t('PNO')} value={row.member.pno} />
                        <DetailRow label={t('Rank')} value={row.member.rank} />
                        <DetailRow label={t('Gender')} value={genderLabel ? t(genderLabel) : row.member.gender} />
                        {row.member.full_name && <DetailRow label={t('Name')} value={row.member.full_name} full />}
                        <DetailRow label={t('Unit')} value={row.member.unit_name} full />
                    </SectionCard>

                    {/* Result */}
                    <SectionCard title={t('Result')}>
                        <DetailRow label={t('Medal')} value={t(row.medal_type)} />
                        <DetailRow label={t('Position')} value={row.position !== null ? String(row.position) : null} />
                        {row.remarks && <DetailRow label={t('Remarks')} value={row.remarks} full />}
                    </SectionCard>

                    {/* Benefit */}
                    {row.benefit && (
                        <SectionCard title={t('Benefit')}>
                            <DetailRow label={t('Benefit type')} value={t(row.benefit.benefit_type)} />
                            <DetailRow label={t('Benefit date')} value={formatDisplayDate(row.benefit.benefit_date)} />
                            <DetailRow label={t('Order reference')} value={row.benefit.order_reference} />
                            <DetailRow label={t('Cash amount')} value={row.benefit.cash_amount} />
                            <DetailRow label={t('Promoted from')} value={row.benefit.promoted_from_rank} />
                            <DetailRow label={t('Promoted to')} value={row.benefit.promoted_to_rank} />
                            {row.benefit.remarks && <DetailRow label={t('Remarks')} value={row.benefit.remarks} full />}
                        </SectionCard>
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsMedals({
    defaultYearFrom,
    defaultYearTo,
    defaultSessionId,
    sessions,
    sports,
    tiers,
    units,
    districts,
    ranks,
    designations,
    tournaments,
    events,
    venues,
    disciplines,
    weightCategories,
}: {
    defaultYearFrom: number;
    defaultYearTo: number;
    defaultSessionId: number | null;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
    districts: District[];
    ranks: RankOption[];
    designations: DesignationOption[];
    tournaments: TournamentOption[];
    events: EventOption[];
    venues: string[];
    disciplines: string[];
    weightCategories: string[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Reports') }, { title: t('Medal Tally') }],
    });

    const [filters, setFilters] = useState<Filters>({
        year_from: String(defaultYearFrom),
        year_to: String(defaultYearTo),
        date_from: '',
        date_to: '',
        session_ids: defaultSessionId ? [String(defaultSessionId)] : [],
        sport_ids: [],
        tier_ids: [],
        unit_ids: [],
        district_ids: [],
        rank_codes: [],
        designations: [],
        player_categories: [],
        player_levels: [],
        statuses: [],
        tournament_ids: [],
        tournament_name: '',
        venue: '',
        event_name: '',
        event_ids: [],
        disciplines: [],
        weight_categories: [],
        event_gender_classes: [],
        medal_types: [],
        genders: [],
        position_from: '',
        position_to: '',
        has_remarks: ALL,
        benefit_types: [],
        benefit_date_from: '',
        benefit_date_to: '',
        order_reference: '',
    });

    const [memberSearch, setMemberSearch] = useState('');
    const memberSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [memberSearchDraft, setMemberSearchDraft] = useState('');

    const [tab, setTab] = useState<'tally' | 'detail'>('tally');
    const [tallyMode, setTallyMode] = useState<'tier' | 'team'>('tier');
    const [perPage, setPerPage] = useState(25);
    const [page, setPage] = useState(1);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Pivot (tally)
    const [pivotRows, setPivotRows] = useState<(PivotRow | TeamPivotRow)[] | null>(null);
    const { get: getPivot, processing: pivotLoading } = useHttp<Record<string, never>, PivotResponse>({});

    // Detail
    const [detailData, setDetailData] = useState<DetailResponse | null>(null);
    const { get: getDetail, processing: detailLoading } = useHttp<Record<string, never>, DetailResponse>({});

    // Modals
    const [selectedRow, setSelectedRow] = useState<MedalRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);

    const hasFilterValue = (value: string | string[]): boolean =>
        Array.isArray(value) ? value.length > 0 : value !== '' && value !== ALL;

    const hasAnyFilter = Object.values(filters).some(hasFilterValue) || !!memberSearch;

    const buildParams = useCallback(
        (extra?: Record<string, string | number>): Record<string, string | string[]> => {
            const p: Record<string, string | string[]> = {};

            for (const [key, value] of Object.entries(filters)) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        p[key] = value;
                    }

                    continue;
                }

                if (value !== '' && value !== ALL) {
                    p[key] = value;
                }
            }

            if (memberSearch) {
 p['member_name'] = memberSearch;
}

            if (extra) {
                for (const [k, v] of Object.entries(extra)) {
                    p[k] = String(v);
                }
            }

            return p;
        },
        [filters, memberSearch],
    );

    // Fetch pivot
    useEffect(() => {
        if (tab !== 'tally') {
 return;
}

        getPivot(MedalsPivotController.url({ query: buildParams(tallyMode === 'team' ? { group_by: 'team' } : undefined) }), {
            onSuccess: (res) => {
                const r = res as unknown as PivotResponse;
                setPivotRows(r?.data ?? []);
            },
            onError: () => setPivotRows([]),
        });
    }, [filters, memberSearch, tab, tallyMode, getPivot, buildParams]);

    // Fetch detail
    useEffect(() => {
        if (tab !== 'detail') {
 return;
}

        getDetail(MedalsDetailController.url({ query: buildParams({ per_page: perPage, page }) }), {
            onSuccess: (res) => {
                setDetailData(res as unknown as DetailResponse);
            },
            onError: () => setDetailData(null),
        });
    }, [filters, memberSearch, tab, perPage, page, getDetail, buildParams]);

    // Reset page when filters change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [filters, memberSearch, perPage]);

    const handleMemberSearchChange = (val: string) => {
        setMemberSearchDraft(val);

        if (memberSearchRef.current) {
 clearTimeout(memberSearchRef.current);
}

        memberSearchRef.current = setTimeout(() => setMemberSearch(val.trim()), 400);
    };

    const setFilter = (key: keyof Filters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const setArrayFilter = (key: keyof Filters, value: string[]) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearAll = () => {
        setFilters({
            year_from: '',
            year_to: '',
            date_from: '',
            date_to: '',
            session_ids: [],
            sport_ids: [],
            tier_ids: [],
            unit_ids: [],
            district_ids: [],
            rank_codes: [],
            designations: [],
            player_categories: [],
            player_levels: [],
            statuses: [],
            tournament_ids: [],
            tournament_name: '',
            venue: '',
            event_name: '',
            event_ids: [],
            disciplines: [],
            weight_categories: [],
            event_gender_classes: [],
            medal_types: [],
            genders: [],
            position_from: '',
            position_to: '',
            has_remarks: ALL,
            benefit_types: [],
            benefit_date_from: '',
            benefit_date_to: '',
            order_reference: '',
        });
        setMemberSearchDraft('');
        setMemberSearch('');
    };

    const handlePrint = (orientation: 'portrait' | 'landscape') => {
        const styleEl = document.createElement('style');
        styleEl.id = '__medals-print-style__';
        styleEl.textContent = `@page { size: A4 ${orientation}; margin: 1.2cm; } @media print { body > *:not(#medals-print-root) { display: none !important; } #medals-print-root { display: block !important; } }`;
        document.head.appendChild(styleEl);
        window.print();
        document.head.removeChild(styleEl);
    };

    const triggerPrint = () => {
        const rowCount = tab === 'tally' ? (pivotRows?.length ?? 0) : (detailData?.total ?? 0);

        if (rowCount > 20) {
            setPrintOpen(true);
        } else {
            handlePrint('portrait');
        }
    };

    const buildExportUrl = () => {
        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(buildParams())) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    params.append(`${key}[]`, item);
                }

                continue;
            }

            params.set(key, value);
        }

        if (tab === 'tally' && tallyMode === 'team') {
            params.set('group_by', 'team');
        }

        const qs = params.toString();

        return MedalsExportController.url() + (qs ? '?' + qs : '');
    };

    const optionLabels = (options: MultiSelectOption[], values: string[]): string | undefined => {
        if (values.length === 0) {
            return undefined;
        }

        const labels = options
            .filter((option) => values.includes(option.value))
            .map((option) => option.label);

        return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ');
    };

    const sessionOptions = sessions.map((session) => ({ value: String(session.id), label: session.name }));
    const sportOptions = sports.map((sport) => ({ value: String(sport.id), label: sport.name }));
    const tierOptions = tiers.map((tier) => ({ value: String(tier.id), label: tier.label_hi }));
    const unitOptions = units.map((unit) => ({ value: String(unit.id), label: unit.name }));
    const districtOptions = districts.map((district) => ({ value: String(district.id), label: district.name }));
    const rankOptions = ranks.map((rank) => ({ value: rank.code, label: [rank.name, rank.short_name].filter(Boolean).join(' · ') }));
    const designationOptions = designations.map((designation) => ({ value: designation.code, label: [designation.name, designation.short_name].filter(Boolean).join(' · ') }));
    const selectedSessionId = filters.session_ids[0] ?? ALL;
    const selectedTournamentId = filters.tournament_ids[0] ?? ALL;
    const selectedEventId = filters.event_ids[0] ?? ALL;
    const visibleTournaments = tournaments.filter(
        (tournament) => selectedSessionId === ALL || String(tournament.session_id) === selectedSessionId,
    );
    const visibleEvents = events.filter((event) =>
        selectedTournamentId !== ALL
            ? String(event.tournament_id) === selectedTournamentId
            : visibleTournaments.some((tournament) => tournament.id === event.tournament_id),
    );
    const tournamentOptions = visibleTournaments.map((tournament) => ({
        value: String(tournament.id),
        label: [tournament.name, formatDisplayDate(tournament.date_from)].filter(Boolean).join(' · '),
    }));
    const eventOptions = visibleEvents.map((event) => ({ value: String(event.id), label: event.name }));
    const venueOptions = venues.map((venue) => ({ value: venue, label: venue }));
    const disciplineOptions = disciplines.map((discipline) => ({ value: discipline, label: discipline }));
    const weightCategoryOptions = weightCategories.map((weightCategory) => ({ value: weightCategory, label: weightCategory }));
    const medalOptions = MEDAL_TYPES.map((medal) => ({ value: medal, label: t(medal) }));
    const genderOptions = GENDER_OPTIONS.map((gender) => ({ value: gender.value, label: t(gender.label) }));
    const playerCategoryOptions = PLAYER_CATEGORY_OPTIONS.map((value) => ({ value, label: t(value) }));
    const playerLevelOptions = PLAYER_LEVEL_OPTIONS.map((value) => ({ value, label: t(value) }));
    const statusOptions = STATUS_OPTIONS.map((value) => ({ value, label: t(value) }));
    const eventGenderClassOptions = EVENT_GENDER_CLASS_OPTIONS.map((value) => ({ value, label: t(value) }));
    const benefitTypeOptions = BENEFIT_TYPE_OPTIONS.map((value) => ({ value, label: t(value) }));

    // Label helpers
    const yearRangeLabel = (() => {
        const from = filters.year_from || null;
        const to = filters.year_to || null;

        if (from && to && from === to) {
return from;
}

        if (from && to) {
return `${from} – ${to}`;
}

        if (from) {
return `≥ ${from}`;
}

        if (to) {
return `≤ ${to}`;
}

        return undefined;
    })();
    const sessionLabel = optionLabels(sessionOptions, filters.session_ids);
    const sportLabel = optionLabels(sportOptions, filters.sport_ids);
    const tournamentLabel = optionLabels(tournamentOptions, filters.tournament_ids);
    const eventLabel = optionLabels(eventOptions, filters.event_ids);
    const tierLabel = optionLabels(tierOptions, filters.tier_ids);
    const unitLabel = optionLabels(unitOptions, filters.unit_ids);
    const medalLabel = optionLabels(medalOptions, filters.medal_types);
    const genderLabel = optionLabels(genderOptions, filters.genders);

    const grandTotal = pivotRows
        ? pivotRows.reduce((acc, r) => acc + r.GOLD + r.SILVER + r.BRONZE + r.MERIT, 0)
        : null;
    const displayOnlyTotal = pivotRows
        ? pivotRows.reduce((acc, r) => acc + r.display_only, 0)
        : null;
    const tierRows = (pivotRows ?? []) as PivotRow[];
    const teamRows = (pivotRows ?? []) as TeamPivotRow[];

    return (
        <>
            <Head title={t('Medal Tally')} />

            <div id="medals-print-root" className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <Heading title={t('Medal Tally')} />
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" onClick={triggerPrint}>
                            <Printer className="mr-1.5 size-4" />
                            {t('Print')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
 window.location.href = buildExportUrl();
}}>
                            <Download className="mr-1.5 size-4" />
                            {t('Export CSV')}
                        </Button>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Member search */}
                    <div className="relative w-48 shrink-0">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t('Search athlete…')}
                            value={memberSearchDraft}
                            onChange={(e) => handleMemberSearchChange(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    {/* Year range */}
                    <FilterPill
                        label={t('Year')}
                        activeLabel={yearRangeLabel}
                        onClear={() => setFilters((prev) => ({ ...prev, year_from: '', year_to: '' }))}
                    >
                        <div className="flex flex-col gap-3 p-3 w-52">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t('From year')}</label>
                                <Input
                                    type="number"
                                    min={1900}
                                    max={2099}
                                    placeholder="e.g. 2019"
                                    value={filters.year_from}
                                    onChange={(e) => setFilter('year_from', e.target.value.trim())}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t('To year')}</label>
                                <Input
                                    type="number"
                                    min={1900}
                                    max={2099}
                                    placeholder="e.g. 2026"
                                    value={filters.year_to}
                                    onChange={(e) => setFilter('year_to', e.target.value.trim())}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                    </FilterPill>

                    <Select
                        value={selectedSessionId}
                        onValueChange={(value) => {
                            setFilters((prev) => ({
                                ...prev,
                                session_ids: value === ALL ? [] : [value],
                                tournament_ids: [],
                                event_ids: [],
                            }));
                        }}
                    >
                        <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue placeholder={t('Session')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Sessions')}</SelectItem>
                            {sessionOptions.map((session) => (
                                <SelectItem key={session.value} value={session.value}>
                                    {session.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedTournamentId}
                        onValueChange={(value) => {
                            setFilters((prev) => ({
                                ...prev,
                                tournament_ids: value === ALL ? [] : [value],
                                event_ids: [],
                            }));
                        }}
                    >
                        <SelectTrigger className="h-8 w-64 text-xs">
                            <SelectValue placeholder={t('Tournament')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Tournaments')}</SelectItem>
                            {tournamentOptions.map((tournament) => (
                                <SelectItem key={tournament.value} value={tournament.value}>
                                    {tournament.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedEventId}
                        onValueChange={(value) => setArrayFilter('event_ids', value === ALL ? [] : [value])}
                    >
                        <SelectTrigger className="h-8 w-56 text-xs">
                            <SelectValue placeholder={t('Event')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('All Events')}</SelectItem>
                            {eventOptions.map((event) => (
                                <SelectItem key={event.value} value={event.value}>
                                    {event.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <OptionMultiSelect
                        value={filters.sport_ids}
                        onValueChange={(value) => setArrayFilter('sport_ids', value)}
                        options={sportOptions}
                        placeholder={t('All Sports')}
                        searchPlaceholder={t('Search sports…')}
                        className="w-44"
                    />

                    <OptionMultiSelect
                        value={filters.medal_types}
                        onValueChange={(value) => setArrayFilter('medal_types', value)}
                        options={medalOptions}
                        placeholder={t('All Medals')}
                        className="w-40"
                    />

                    <Button
                        type="button"
                        variant={advancedOpen ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setAdvancedOpen((open) => !open)}
                    >
                        {t('Advanced filters')}
                    </Button>

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

                {hasAnyFilter && (
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {[
                            yearRangeLabel ? `${t('Year')}: ${yearRangeLabel}` : null,
                            sessionLabel ? `${t('Session')}: ${sessionLabel}` : null,
                            tournamentLabel ? `${t('Tournament')}: ${tournamentLabel}` : null,
                            eventLabel ? `${t('Event')}: ${eventLabel}` : null,
                            sportLabel ? `${t('Sport')}: ${sportLabel}` : null,
                            tierLabel ? `${t('Tier')}: ${tierLabel}` : null,
                            unitLabel ? `${t('Unit')}: ${unitLabel}` : null,
                            medalLabel ? `${t('Medal')}: ${medalLabel}` : null,
                            genderLabel ? `${t('Gender')}: ${genderLabel}` : null,
                            memberSearch ? `${t('Athlete')}: ${memberSearch}` : null,
                        ].filter(Boolean).map((label) => (
                            <span key={label} className="rounded-md border bg-muted/30 px-2 py-1">
                                {label}
                            </span>
                        ))}
                    </div>
                )}

                {advancedOpen && (
                    <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 lg:grid-cols-4">
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t('Athlete')}</h3>
                            <OptionMultiSelect
                                value={filters.rank_codes}
                                onValueChange={(value) => setArrayFilter('rank_codes', value)}
                                options={rankOptions}
                                placeholder={t('All Ranks')}
                                searchPlaceholder={t('Search ranks…')}
                            />
                            <OptionMultiSelect
                                value={filters.designations}
                                onValueChange={(value) => setArrayFilter('designations', value)}
                                options={designationOptions}
                                placeholder={t('All Designations')}
                                searchPlaceholder={t('Search designations…')}
                            />
                            <OptionMultiSelect
                                value={filters.district_ids}
                                onValueChange={(value) => setArrayFilter('district_ids', value)}
                                options={districtOptions}
                                placeholder={t('All Districts')}
                                searchPlaceholder={t('Search districts…')}
                            />
                            <OptionMultiSelect
                                value={filters.unit_ids}
                                onValueChange={(value) => setArrayFilter('unit_ids', value)}
                                options={unitOptions}
                                placeholder={t('All Units')}
                                searchPlaceholder={t('Search units…')}
                            />
                            <OptionMultiSelect
                                value={filters.genders}
                                onValueChange={(value) => setArrayFilter('genders', value)}
                                options={genderOptions}
                                placeholder={t('All Genders')}
                            />
                            <OptionMultiSelect
                                value={filters.player_categories}
                                onValueChange={(value) => setArrayFilter('player_categories', value)}
                                options={playerCategoryOptions}
                                placeholder={t('All Player Categories')}
                            />
                            <OptionMultiSelect
                                value={filters.player_levels}
                                onValueChange={(value) => setArrayFilter('player_levels', value)}
                                options={playerLevelOptions}
                                placeholder={t('All Player Levels')}
                            />
                            <OptionMultiSelect
                                value={filters.statuses}
                                onValueChange={(value) => setArrayFilter('statuses', value)}
                                options={statusOptions}
                                placeholder={t('All Statuses')}
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t('Tournament')}</h3>
                            <OptionMultiSelect
                                value={filters.tier_ids}
                                onValueChange={(value) => setArrayFilter('tier_ids', value)}
                                options={tierOptions}
                                placeholder={t('All Tiers')}
                            />
                            <OptionMultiSelect
                                value={filters.venue ? [filters.venue] : []}
                                onValueChange={(value) => setFilter('venue', value.at(-1) ?? '')}
                                options={venueOptions}
                                placeholder={t('All Venues')}
                                searchPlaceholder={t('Search venues…')}
                            />
                            <Input
                                value={filters.tournament_name}
                                onChange={(event) => setFilter('tournament_name', event.target.value)}
                                placeholder={t('Tournament name')}
                                className="h-9"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(event) => setFilter('date_from', event.target.value)}
                                    className="h-9"
                                />
                                <Input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(event) => setFilter('date_to', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t('Event')}</h3>
                            <OptionMultiSelect
                                value={filters.disciplines}
                                onValueChange={(value) => setArrayFilter('disciplines', value)}
                                options={disciplineOptions}
                                placeholder={t('All Disciplines')}
                                searchPlaceholder={t('Search disciplines…')}
                            />
                            <OptionMultiSelect
                                value={filters.weight_categories}
                                onValueChange={(value) => setArrayFilter('weight_categories', value)}
                                options={weightCategoryOptions}
                                placeholder={t('All Weight Categories')}
                                searchPlaceholder={t('Search weight categories…')}
                            />
                            <OptionMultiSelect
                                value={filters.event_gender_classes}
                                onValueChange={(value) => setArrayFilter('event_gender_classes', value)}
                                options={eventGenderClassOptions}
                                placeholder={t('All Event Gender Classes')}
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t('Result & Benefit')}</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    value={filters.position_from}
                                    onChange={(event) => setFilter('position_from', event.target.value)}
                                    placeholder={t('Position from')}
                                    className="h-9"
                                />
                                <Input
                                    type="number"
                                    min={1}
                                    value={filters.position_to}
                                    onChange={(event) => setFilter('position_to', event.target.value)}
                                    placeholder={t('Position to')}
                                    className="h-9"
                                />
                            </div>
                            <OptionList
                                options={[
                                    { value: '1', label: t('With remarks') },
                                    { value: '0', label: t('Without remarks') },
                                ]}
                                value={filters.has_remarks}
                                onSelect={(value) => setFilter('has_remarks', value)}
                            />
                            <OptionMultiSelect
                                value={filters.benefit_types}
                                onValueChange={(value) => setArrayFilter('benefit_types', value)}
                                options={benefitTypeOptions}
                                placeholder={t('All Benefits')}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    value={filters.benefit_date_from}
                                    onChange={(event) => setFilter('benefit_date_from', event.target.value)}
                                    className="h-9"
                                />
                                <Input
                                    type="date"
                                    value={filters.benefit_date_to}
                                    onChange={(event) => setFilter('benefit_date_to', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <Input
                                value={filters.order_reference}
                                onChange={(event) => setFilter('order_reference', event.target.value)}
                                placeholder={t('Order reference')}
                                className="h-9"
                            />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'tally' | 'detail')}>
                    <div className="flex items-center gap-3">
                        <TabsList>
                            <TabsTrigger value="tally">{t('Medal Tally')}</TabsTrigger>
                            <TabsTrigger value="detail">{t('Medal Detail')}</TabsTrigger>
                        </TabsList>

                        {tab === 'tally' && (
                            <div className="inline-flex h-9 rounded-md border bg-background p-0.5">
                                {([
                                    ['tier', t('By Tier')],
                                    ['team', t('By Team')],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setTallyMode(value)}
                                        className={[
                                            'rounded px-3 text-xs font-medium transition-colors',
                                            tallyMode === value
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground',
                                        ].join(' ')}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Medal counts — shown inline to the right of the tab bar */}
                        {detailData !== null && detailData.total > 0 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {([
                                    { type: 'GOLD',   emoji: '🥇', cls: 'text-yellow-600 dark:text-yellow-400' },
                                    { type: 'SILVER', emoji: '🥈', cls: 'text-slate-500 dark:text-slate-300' },
                                    { type: 'BRONZE', emoji: '🥉', cls: 'text-orange-600 dark:text-orange-400' },
                                    { type: 'MERIT',  emoji: '🏅', cls: 'text-blue-500 dark:text-blue-400' },
                                ] as const).map(({ type, emoji, cls }) =>
                                    detailData.medal_counts[type] > 0 ? (
                                        <span key={type} className={`flex items-center gap-1 text-sm font-semibold ${cls}`}>
                                            <span>{emoji}</span>
                                            <span>{detailData.medal_counts[type]}</span>
                                        </span>
                                    ) : null,
                                )}
                                <span className="text-xs text-muted-foreground">
                                    ({t('Total')}: <strong className="text-foreground">{detailData.total}</strong>)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Tally tab ── */}
                    <TabsContent value="tally" className="mt-4">
                        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold">
                                        {t(tallyMode === 'team' ? 'Team medal tally' : 'Tier medal tally')}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {t(tallyMode === 'team' ? 'Team medals are counted once per team, event, and medal type.' : 'Tier totals exclude display-only medals.')}
                                    </div>
                                </div>
                                {pivotRows !== null && pivotRows.length > 0 && (
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-muted-foreground">{t('Calculated total')}</span>
                                        <CountCell value={grandTotal ?? 0} strong />
                                        {displayOnlyTotal !== null && displayOnlyTotal > 0 && (
                                            <>
                                                <span className="text-muted-foreground">{t('Display only')}</span>
                                                <DisplayOnlyCell value={displayOnlyTotal} />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            {pivotLoading || pivotRows === null ? (
                                <div className="space-y-2 p-4">
                                    {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-10 w-full" />)}
                                </div>
                            ) : pivotRows.length === 0 ? (
                                <div className="p-6">
                                    <p className="text-sm text-muted-foreground">{t('No data.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-muted/60">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">{t(tallyMode === 'team' ? 'S No' : 'Rank')}</TableHead>
                                            <TableHead className="min-w-56">{t(tallyMode === 'team' ? 'Team' : 'Tier')}</TableHead>
                                            {tallyMode === 'team' && (
                                                <>
                                                    <TableHead className="min-w-36">{t('Sport')}</TableHead>
                                                    <TableHead className="min-w-32">{t('Session')}</TableHead>
                                                </>
                                            )}
                                            <TableHead className="w-24 text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('GOLD')].join(' ')}>{t('GOLD')}</span></TableHead>
                                            <TableHead className="w-24 text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('SILVER')].join(' ')}>{t('SILVER')}</span></TableHead>
                                            <TableHead className="w-24 text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('BRONZE')].join(' ')}>{t('BRONZE')}</span></TableHead>
                                            <TableHead className="w-24 text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('MERIT')].join(' ')}>{t('MERIT')}</span></TableHead>
                                            <TableHead className="w-28 text-center">{t('Calculated')}</TableHead>
                                            <TableHead className="w-28 text-center">{t('Display only')}</TableHead>
                                            {tallyMode === 'team' && (
                                                <>
                                                    <TableHead className="w-24 text-center">{t('Events')}</TableHead>
                                                    <TableHead className="w-24 text-center">{t('Players')}</TableHead>
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tallyMode === 'tier' && tierRows.map((row, index) => {
                                            const total = row.GOLD + row.SILVER + row.BRONZE + row.MERIT;

                                            return (
                                                <TableRow
                                                    key={row.tier.code}
                                                    className="cursor-pointer border-b hover:bg-muted/40"
                                                    onClick={() => {
 const tierId = tiers.find((ti) => ti.code === row.tier.code)?.id;

 if (tierId) {
 setFilters((prev) => ({ ...prev, tier_ids: [String(tierId)] }));
}

 setTab('detail');
}}
                                                >
                                                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{row.tier.label}</div>
                                                        <div className="text-xs text-muted-foreground">{row.tier.code}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.GOLD} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.SILVER} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.BRONZE} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.MERIT} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={total} strong={total > 0} /></TableCell>
                                                    <TableCell className="text-center"><DisplayOnlyCell value={row.display_only} /></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {tallyMode === 'team' && teamRows.map((row, index) => {
                                            const total = row.GOLD + row.SILVER + row.BRONZE + row.MERIT;

                                            return (
                                                <TableRow key={row.team.id} className="border-b hover:bg-muted/40">
                                                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="max-w-72 truncate font-medium">{row.team.name}</div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {[row.team.unit_name, row.team.district_name].filter(Boolean).map((label) => (
                                                                <Badge key={label} variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
                                                                    {label}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{row.team.sport_name ?? '—'}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{row.team.session_name ?? '—'}</TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.GOLD} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.SILVER} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.BRONZE} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.MERIT} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={total} strong={total > 0} /></TableCell>
                                                    <TableCell className="text-center"><DisplayOnlyCell value={row.display_only} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.events} /></TableCell>
                                                    <TableCell className="text-center"><CountCell value={row.players} /></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {pivotRows.length > 1 && (
                                            <TableRow className="border-t-2 bg-muted/40 font-bold">
                                                {tallyMode === 'team' && <TableCell />}
                                                <TableCell>{t('Total')}</TableCell>
                                                {tallyMode === 'team' && (
                                                    <>
                                                        <TableCell />
                                                        <TableCell />
                                                    </>
                                                )}
                                                <TableCell className="text-center"><CountCell value={pivotRows.reduce((a, r) => a + r.GOLD, 0)} /></TableCell>
                                                <TableCell className="text-center"><CountCell value={pivotRows.reduce((a, r) => a + r.SILVER, 0)} /></TableCell>
                                                <TableCell className="text-center"><CountCell value={pivotRows.reduce((a, r) => a + r.BRONZE, 0)} /></TableCell>
                                                <TableCell className="text-center"><CountCell value={pivotRows.reduce((a, r) => a + r.MERIT, 0)} /></TableCell>
                                                <TableCell className="text-center"><CountCell value={grandTotal ?? 0} strong /></TableCell>
                                                <TableCell className="text-center"><DisplayOnlyCell value={displayOnlyTotal ?? 0} /></TableCell>
                                                {tallyMode === 'team' && (
                                                    <>
                                                        <TableCell />
                                                        <TableCell />
                                                    </>
                                                )}
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </div>
                        {!pivotLoading && pivotRows !== null && pivotRows.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t('Display-only medals are visible for review but excluded from calculated medal totals.')}
                            </p>
                        )}
                    </TabsContent>

                    {/* ── Detail tab ── */}
                    <TabsContent value="detail" className="mt-4 space-y-3">
                        {/* Row count + per page */}
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">
                                {detailData !== null ? `${detailData.total} ${t('results')}` : ''}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>{t('Per page:')}</span>
                                {PER_PAGE_OPTIONS.map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setPerPage(n)}
                                        className={[
                                            'h-6 min-w-7 rounded border px-1.5 text-xs',
                                            perPage === n
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-background hover:bg-accent',
                                        ].join(' ')}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold">{t('Medal records')}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('Player-level medal records with tournament and event context.')}
                                    </div>
                                </div>
                                {detailData !== null && (
                                    <div className="text-xs text-muted-foreground">
                                        {t('Showing :from–:to of :total')
                                            .replace(':from', String(detailData.from ?? 0))
                                            .replace(':to', String(detailData.to ?? 0))
                                            .replace(':total', String(detailData.total))}
                                    </div>
                                )}
                            </div>
                            {detailLoading || detailData === null ? (
                                <div className="space-y-2 p-4">
                                    {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-10 w-full" />)}
                                </div>
                            ) : detailData.data.length === 0 ? (
                                <div className="p-6">
                                    <p className="text-sm text-muted-foreground">{t('No data.')}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-muted/60">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">#</TableHead>
                                            <TableHead className="w-28">{t('Medal')}</TableHead>
                                            <TableHead className="min-w-56">{t('Athlete')}</TableHead>
                                            <TableHead className="min-w-24">{t('Rank')}</TableHead>
                                            <TableHead className="min-w-36">{t('Unit')}</TableHead>
                                            <TableHead className="min-w-56">{t('Sport / Event')}</TableHead>
                                            <TableHead className="min-w-64">{t('Tournament')}</TableHead>
                                            <TableHead className="min-w-28">{t('Tier')}</TableHead>
                                            <TableHead className="min-w-28">{t('Session')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailData.data.map((row, idx) => (
                                            <TableRow
                                                key={row.id}
                                                className="cursor-pointer border-b hover:bg-muted/40"
                                                onClick={() => {
 setSelectedRow(row); setModalOpen(true);
}}
                                            >
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                    {(detailData.from ?? 0) + idx}
                                                </TableCell>
                                                <TableCell>
                                                    <MedalBadge type={row.medal_type} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-56 truncate font-medium">{row.member.full_name}</div>
                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        {[row.member.member_code, row.member.pno].filter(Boolean).join(' · ')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{row.member.rank ?? '—'}</TableCell>
                                                <TableCell className="text-sm">{row.member.unit_name ?? '—'}</TableCell>
                                                <TableCell>
                                                    <div className="max-w-52 truncate text-sm font-medium">{row.sport.name}</div>
                                                    <div className="max-w-52 truncate text-xs text-muted-foreground">{row.event.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-64 truncate text-sm font-medium">{row.tournament.name}</div>
                                                    {row.tournament.date_from && (
                                                        <div className="text-xs text-muted-foreground">{formatDisplayDate(row.tournament.date_from)}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {row.tournament.tier_label ? (
                                                        <Badge variant="outline" className="text-xs">{row.tournament.tier_label}</Badge>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{row.session_name ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {detailData !== null && detailData.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                                <span>
                                    {t('Showing :from–:to of :total')
                                        .replace(':from', String(detailData.from ?? 0))
                                        .replace(':to', String(detailData.to ?? 0))
                                        .replace(':total', String(detailData.total))}
                                </span>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: detailData.last_page }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === detailData.last_page || Math.abs(p - page) <= 2)
                                        .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
 acc.push('…');
}

                                            acc.push(p);

                                            return acc;
                                        }, [])
                                        .map((p, idx) =>
                                            p === '…' ? (
                                                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPage(p as number)}
                                                    className={[
                                                        'h-8 min-w-8 rounded border px-2',
                                                        page === p
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-input bg-background hover:bg-accent',
                                                    ].join(' ')}
                                                >
                                                    {p}
                                                </button>
                                            ),
                                        )}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modals */}
            <MedalDetailModal row={selectedRow} open={modalOpen} onOpenChange={setModalOpen} />
            <PrintDialog open={printOpen} onOpenChange={setPrintOpen} onPrint={handlePrint} />
        </>
    );
}
