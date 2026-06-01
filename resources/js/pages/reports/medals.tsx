import { Head, setLayoutProps, useHttp } from '@inertiajs/react';
import { Check, ChevronDown, Download, Printer, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import MedalsDetailController from '@/actions/App/Http/Controllers/Api/V1/MedalsDetailController';
import MedalsPivotController from '@/actions/App/Http/Controllers/Api/V1/MedalsPivotController';
import MedalsExportController from '@/actions/App/Http/Controllers/MedalsExportController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

// ── Types ─────────────────────────────────────────────────────────────────────

type Session = { id: number; name: string };
type Sport = { id: number; name_hi: string; name_en: string };
type Tier = { id: number; code: string; label_hi: string; label_en: string };
type Unit = { id: number; name_hi: string; name_en: string };

type PivotRow = {
    tier: { code: string; label: string; weight: number };
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    MERIT: number;
};

type PivotResponse = {
    data: PivotRow[];
    filters: Record<string, unknown>;
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
        full_name_hi: string;
        full_name_en: string | null;
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
    sport: { id: number; name_hi: string; name_en: string | null };
    event: {
        id: number;
        name: string;
        discipline: string | null;
        weight_category: string | null;
        gender_class: string | null;
    };
    benefit: Benefit | null;
};

type DetailResponse = {
    data: MedalRow[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    session_id: string;
    sport_id: string;
    tier_id: string;
    unit_id: string;
    medal_type: string;
    gender: string;
};

const ALL = 'all';

const MEDAL_TYPES = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'] as const;
const GENDER_OPTIONS = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other gender' },
] as const;
const PER_PAGE_OPTIONS = [15, 25, 50, 100] as const;

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

function SearchableOptionList({ options, value, onSelect, searchPlaceholder }: {
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
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
                            onSelect={() => onSelect(value === opt.value ? ALL : opt.value)}
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
        r.member.full_name_hi,
        r.member.pno ?? '',
        r.member.rank ?? '',
        r.member.unit_name ?? '',
        r.sport.name_hi,
        r.event.name,
        r.tournament.name,
        r.tournament.date_from ?? '',
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
    if (!win) { return; }

    const MEDAL_COLOR: Record<string, string> = {
        GOLD: '#ca8a04',
        SILVER: '#64748b',
        BRONZE: '#c2410c',
        MERIT: '#2563eb',
    };

    const tableRows = rows.map((r) => `
        <tr>
            <td style="color:${MEDAL_COLOR[r.medal_type] ?? '#000'};font-weight:600">${r.medal_type}</td>
            <td>${r.member.full_name_hi}</td>
            <td>${r.member.pno ?? ''}</td>
            <td>${r.member.rank ?? ''}</td>
            <td>${r.member.unit_name ?? ''}</td>
            <td>${r.sport.name_hi}</td>
            <td>${r.event.name}</td>
            <td>${r.tournament.name}</td>
            <td>${r.tournament.date_from ?? ''}</td>
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
        <p class="sub">Printed: ${new Date().toLocaleDateString()}</p>
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
        if (!open) { return; }
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
                                            <div className="text-sm font-medium truncate">{r.member.full_name_hi}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {[r.sport.name_hi, r.event.name].filter(Boolean).join(' · ')}
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
    if (!value) { return null; }

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

    if (!row) { return null; }

    const dateRange = [row.tournament.date_from, row.tournament.date_to].filter(Boolean).join(' – ');
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
            title={[row.sport.name_hi, row.event.name].filter(Boolean).join(' – ')}
            description={t('All medal records for this event')}
            params={{ tournament_id: String(row.tournament.id), event_name: row.event.name }}
        />
        {row.member.pno && (
            <RelatedMedalsModal
                open={subModal === 'athlete'}
                onOpenChange={(v) => setSubModal(v ? 'athlete' : null)}
                title={row.member.full_name_hi}
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
                            <h2 className="text-lg font-bold leading-tight">{row.member.full_name_hi}</h2>
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
                        <DialogTitle>{row.member.full_name_hi}</DialogTitle>
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
                        <DetailRow label={t('Sport')} value={row.sport.name_hi} />
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
                        {row.member.full_name_en && <DetailRow label={t('Name (English)')} value={row.member.full_name_en} full />}
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
                            <DetailRow label={t('Benefit date')} value={row.benefit.benefit_date} />
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
    defaultSessionId,
    sessions,
    sports,
    tiers,
    units,
}: {
    defaultSessionId: number | null;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
    units: Unit[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [{ title: t('Reports') }, { title: t('Medal Tally') }],
    });

    const [filters, setFilters] = useState<Filters>({
        session_id: defaultSessionId ? String(defaultSessionId) : ALL,
        sport_id: ALL,
        tier_id: ALL,
        unit_id: ALL,
        medal_type: ALL,
        gender: ALL,
    });

    const [memberSearch, setMemberSearch] = useState('');
    const memberSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [memberSearchDraft, setMemberSearchDraft] = useState('');

    const [tab, setTab] = useState<'tally' | 'detail'>('tally');
    const [perPage, setPerPage] = useState(25);
    const [page, setPage] = useState(1);

    // Pivot (tally)
    const [pivotRows, setPivotRows] = useState<PivotRow[] | null>(null);
    const { get: getPivot, processing: pivotLoading } = useHttp<Record<string, never>, PivotResponse>({});

    // Detail
    const [detailData, setDetailData] = useState<DetailResponse | null>(null);
    const { get: getDetail, processing: detailLoading } = useHttp<Record<string, never>, DetailResponse>({});

    // Modals
    const [selectedRow, setSelectedRow] = useState<MedalRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);

    const hasAnyFilter = Object.values(filters).some((v) => v !== ALL) || !!memberSearch;

    const buildParams = useCallback(
        (extra?: Record<string, string | number>): Record<string, string> => {
            const p: Record<string, string> = {};

            if (filters.session_id !== ALL) {
 p['session_id'] = filters.session_id;
}

            if (filters.sport_id !== ALL) {
 p['sport_id'] = filters.sport_id;
}

            if (filters.tier_id !== ALL) {
 p['tier_id'] = filters.tier_id;
}

            if (filters.unit_id !== ALL) {
 p['unit_id'] = filters.unit_id;
}

            if (filters.medal_type !== ALL) {
 p['medal_type'] = filters.medal_type;
}

            if (filters.gender !== ALL) {
 p['gender'] = filters.gender;
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

        getPivot(MedalsPivotController.url({ query: buildParams() }), {
            onSuccess: (res) => {
                const r = res as unknown as PivotResponse;
                setPivotRows(r?.data ?? []);
            },
            onError: () => setPivotRows([]),
        });
    }, [filters, memberSearch, tab, getPivot, buildParams]);

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

    const clearAll = () => {
        setFilters({ session_id: ALL, sport_id: ALL, tier_id: ALL, unit_id: ALL, medal_type: ALL, gender: ALL });
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
        const params = new URLSearchParams(buildParams() as Record<string, string>);

        const qs = params.toString();
        return MedalsExportController.url() + (qs ? '?' + qs : '');
    };

    // Label helpers
    const sessionLabel = sessions.find((s) => String(s.id) === filters.session_id)?.name;
    const sportLabel = sports.find((s) => String(s.id) === filters.sport_id)?.name_hi;
    const tierLabel = tiers.find((t) => String(t.id) === filters.tier_id)?.label_hi;
    const unitLabel = units.find((u) => String(u.id) === filters.unit_id)?.name_hi;
    const medalLabel = filters.medal_type !== ALL ? t(filters.medal_type) : undefined;
    const genderLabel = filters.gender !== ALL ? t(GENDER_OPTIONS.find((g) => g.value === filters.gender)?.label ?? filters.gender) : undefined;

    const grandTotal = pivotRows
        ? pivotRows.reduce((acc, r) => acc + r.GOLD + r.SILVER + r.BRONZE + r.MERIT, 0)
        : null;

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

                    {/* Session */}
                    <FilterPill
                        label={t('Session')}
                        activeLabel={sessionLabel}
                        onClear={() => setFilter('session_id', ALL)}
                    >
                        <SearchableOptionList
                            options={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
                            value={filters.session_id}
                            onSelect={(v) => setFilter('session_id', v)}
                            searchPlaceholder={t('Search sessions…')}
                        />
                    </FilterPill>

                    {/* Sport */}
                    <FilterPill
                        label={t('Sport')}
                        activeLabel={sportLabel}
                        onClear={() => setFilter('sport_id', ALL)}
                    >
                        <SearchableOptionList
                            options={sports.map((s) => ({ value: String(s.id), label: s.name_hi }))}
                            value={filters.sport_id}
                            onSelect={(v) => setFilter('sport_id', v)}
                            searchPlaceholder={t('Search sports…')}
                        />
                    </FilterPill>

                    {/* Tier */}
                    <FilterPill
                        label={t('Tier')}
                        activeLabel={tierLabel}
                        onClear={() => setFilter('tier_id', ALL)}
                    >
                        <OptionList
                            options={tiers.map((ti) => ({ value: String(ti.id), label: ti.label_hi }))}
                            value={filters.tier_id}
                            onSelect={(v) => setFilter('tier_id', v)}
                        />
                    </FilterPill>

                    {/* Unit */}
                    <FilterPill
                        label={t('Unit')}
                        activeLabel={unitLabel}
                        onClear={() => setFilter('unit_id', ALL)}
                    >
                        <SearchableOptionList
                            options={units.map((u) => ({ value: String(u.id), label: u.name_hi }))}
                            value={filters.unit_id}
                            onSelect={(v) => setFilter('unit_id', v)}
                            searchPlaceholder={t('Search units…')}
                        />
                    </FilterPill>

                    {/* Medal type */}
                    <FilterPill
                        label={t('Medal')}
                        activeLabel={medalLabel}
                        onClear={() => setFilter('medal_type', ALL)}
                    >
                        <OptionList
                            options={MEDAL_TYPES.map((m) => ({ value: m, label: t(m) }))}
                            value={filters.medal_type}
                            onSelect={(v) => setFilter('medal_type', v)}
                        />
                    </FilterPill>

                    {/* Gender */}
                    <FilterPill
                        label={t('Gender')}
                        activeLabel={genderLabel}
                        onClear={() => setFilter('gender', ALL)}
                    >
                        <OptionList
                            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: t(g.label) }))}
                            value={filters.gender}
                            onSelect={(v) => setFilter('gender', v)}
                        />
                    </FilterPill>

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

                {/* Tabs */}
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'tally' | 'detail')}>
                    <TabsList>
                        <TabsTrigger value="tally">{t('Medal Tally')}</TabsTrigger>
                        <TabsTrigger value="detail">{t('Medal Detail')}</TabsTrigger>
                    </TabsList>

                    {/* ── Tally tab ── */}
                    <TabsContent value="tally" className="mt-4">
                        <div className="rounded-xl border bg-card">
                            {pivotLoading || pivotRows === null ? (
                                <div className="space-y-2 p-4">
                                    {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-10 w-full" />)}
                                </div>
                            ) : pivotRows.length === 0 ? (
                                <div className="p-6">
                                    <p className="text-sm text-muted-foreground">{t('No data.')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Tier')}</TableHead>
                                            <TableHead className="text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('GOLD')].join(' ')}>{t('GOLD')}</span></TableHead>
                                            <TableHead className="text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('SILVER')].join(' ')}>{t('SILVER')}</span></TableHead>
                                            <TableHead className="text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('BRONZE')].join(' ')}>{t('BRONZE')}</span></TableHead>
                                            <TableHead className="text-center"><span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', medalColor('MERIT')].join(' ')}>{t('MERIT')}</span></TableHead>
                                            <TableHead className="text-center">{t('Total')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pivotRows.map((row) => {
                                            const total = row.GOLD + row.SILVER + row.BRONZE + row.MERIT;

                                            return (
                                                <TableRow
                                                    key={row.tier.code}
                                                    className="cursor-pointer hover:bg-muted/40"
                                                    onClick={() => {
 setFilters((prev) => ({ ...prev, tier_id: String(tiers.find((ti) => ti.code === row.tier.code)?.id ?? ALL) })); setTab('detail');
}}
                                                >
                                                    <TableCell className="font-medium">{row.tier.label}</TableCell>
                                                    <TableCell className="text-center font-semibold">{row.GOLD}</TableCell>
                                                    <TableCell className="text-center font-semibold">{row.SILVER}</TableCell>
                                                    <TableCell className="text-center font-semibold">{row.BRONZE}</TableCell>
                                                    <TableCell className="text-center font-semibold">{row.MERIT}</TableCell>
                                                    <TableCell className="text-center font-bold">{total}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {pivotRows.length > 1 && (
                                            <TableRow className="border-t-2 font-bold">
                                                <TableCell>{t('Total')}</TableCell>
                                                <TableCell className="text-center">{pivotRows.reduce((a, r) => a + r.GOLD, 0)}</TableCell>
                                                <TableCell className="text-center">{pivotRows.reduce((a, r) => a + r.SILVER, 0)}</TableCell>
                                                <TableCell className="text-center">{pivotRows.reduce((a, r) => a + r.BRONZE, 0)}</TableCell>
                                                <TableCell className="text-center">{pivotRows.reduce((a, r) => a + r.MERIT, 0)}</TableCell>
                                                <TableCell className="text-center">{grandTotal}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        {!pivotLoading && pivotRows !== null && pivotRows.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">{t('Click a row to drill into its medals in the Detail tab.')}</p>
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

                        <div className="rounded-xl border bg-card">
                            {detailLoading || detailData === null ? (
                                <div className="space-y-2 p-4">
                                    {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-10 w-full" />)}
                                </div>
                            ) : detailData.data.length === 0 ? (
                                <div className="p-6">
                                    <p className="text-sm text-muted-foreground">{t('No data.')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">#</TableHead>
                                            <TableHead>{t('Medal')}</TableHead>
                                            <TableHead>{t('Athlete')}</TableHead>
                                            <TableHead>{t('Rank')}</TableHead>
                                            <TableHead>{t('Unit')}</TableHead>
                                            <TableHead>{t('Sport / Event')}</TableHead>
                                            <TableHead>{t('Tournament')}</TableHead>
                                            <TableHead>{t('Tier')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailData.data.map((row, idx) => (
                                            <TableRow
                                                key={row.id}
                                                className="cursor-pointer hover:bg-muted/40"
                                                onClick={() => {
 setSelectedRow(row); setModalOpen(true);
}}
                                            >
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {(detailData.from ?? 0) + idx}
                                                </TableCell>
                                                <TableCell>
                                                    <MedalBadge type={row.medal_type} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{row.member.full_name_hi}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {[row.member.member_code, row.member.pno].filter(Boolean).join(' · ')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{row.member.rank ?? '—'}</TableCell>
                                                <TableCell className="text-sm">{row.member.unit_name ?? '—'}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{row.sport.name_hi}</div>
                                                    <div className="text-xs text-muted-foreground">{row.event.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-48 truncate text-sm">{row.tournament.name}</div>
                                                    {row.tournament.date_from && (
                                                        <div className="text-xs text-muted-foreground">{row.tournament.date_from}</div>
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
                            )}
                        </div>

                        {/* Pagination */}
                        {detailData !== null && detailData.last_page > 1 && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
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
                                                        'h-7 min-w-7 rounded border px-1.5',
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
