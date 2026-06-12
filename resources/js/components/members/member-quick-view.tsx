import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import MemberPreviewController from '@/actions/App/Http/Controllers/Api/V1/MemberPreviewController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import { index as exportMembersUrl } from '@/actions/App/Http/Controllers/MemberExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type StatusHistoryItem = {
    status: string;
    effective_on: string;
    reason_hi: string | null;
};

type TeamHistoryItem = {
    team_name_hi: string | null;
    session_name: string | null;
    role: string;
    joined_on: string | null;
    left_on: string | null;
};

type AchievementItem = {
    period: string;
    level: string;
    competition_details: string;
    event: string | null;
    medal_type: string | null;
    event_date: string | null;
    venue: string | null;
};

type MemberPreview = {
    id: number;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    father_name_hi: string | null;
    rank: string | null;
    designation: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    recruitment_type: string | null;
    home_address: string | null;
    other_notes: string | null;
    team_since: string | null;
    home_district: { name_hi: string } | null;
    posting_district: { name_hi: string } | null;
    current_unit: { name_hi: string } | null;
    sport: { name_hi: string } | null;
    playable_sports: Array<{
        id: number;
        name_hi: string;
        name_en: string;
        role: string | null;
        position: string | null;
        notes: string | null;
    }>;
    status_history: StatusHistoryItem[];
    team_history: TeamHistoryItem[];
    achievements: AchievementItem[];
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'secondary',
    RETIRED: 'secondary',
};

const MEDAL_COLOR: Record<string, string> = {
    GOLD: 'text-yellow-600',
    SILVER: 'text-slate-500',
    BRONZE: 'text-orange-600',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b py-4 last:border-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid grid-cols-[150px_1fr] gap-1 py-0.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
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

function localizedText(hi: string | null | undefined, en: string | null | undefined, locale: string): string | null {
    if (locale === 'en') {
        return en ?? hi ?? null;
    }

    return hi ?? en ?? null;
}

function postingLocation(data: MemberPreview): string | null {
    return data.posting_district?.name_hi ?? data.current_unit?.name_hi ?? null;
}

function buildPrintHtml(data: MemberPreview, t: (k: string) => string): string {
    const row = (label: string, value: string | null | undefined) =>
        value ? `<div class="row"><span class="label">${label}</span><span class="val">${value}</span></div>` : '';

    const statusRows = data.status_history.map(
        (h) =>
            `<tr><td>${formatDisplayDate(h.effective_on, 'hi') ?? '—'}</td><td>${t(h.status)}</td><td>${h.reason_hi ?? '—'}</td></tr>`,
    ).join('');

    const teamRows = data.team_history.map(
        (th) =>
            `<tr><td>${th.team_name_hi ?? '—'}</td><td>${th.session_name ?? '—'}</td><td>${t(th.role)}</td><td>${formatDisplayDate(th.joined_on, 'hi') ?? '—'}</td><td>${formatDisplayDate(th.left_on, 'hi') ?? t('Present')}</td></tr>`,
    ).join('');

    const achievementRows = data.achievements.map(
        (a) =>
            `<tr><td>${t(a.level)}</td><td>${a.competition_details}</td><td>${a.event ?? '—'}</td><td>${a.medal_type ? t(a.medal_type) : '—'}</td><td>${formatDisplayDate(a.event_date, 'hi') ?? '—'}</td></tr>`,
    ).join('');

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.full_name_hi}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:16px;font-size:11px;line-height:1.35;color:#111}
        h1{font-size:15px;margin:0 0 2px}
        h2{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;color:#555;margin:10px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}
        .header{border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:4px}
        .meta{font-size:10px;color:#555;font-family:monospace}
        .row{display:grid;grid-template-columns:132px 1fr;gap:4px;padding:1px 0}
        .label{color:#555}.val{font-weight:500}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{background:#f0f0f0;text-align:left;padding:3px 6px;font-size:10px;border:1px solid #ccc}
        td{padding:3px 6px;border:1px solid #ccc;font-size:10px;vertical-align:top}
        @media print{@page{margin:1cm}}
    </style>
    </head><body>
    <div class="header">
        <h1>${localizedText(data.full_name_hi, data.full_name_en, 'hi') ?? data.full_name_hi}</h1>
        <span class="meta">${data.pno ? data.pno + ' · ' : ''}${t(data.current_status)}</span>
    </div>
    <h2>${t('Personal')}</h2>
    ${row(t("Father's name"), data.father_name_hi)}
    ${row(t('Date of birth'), formatDisplayDate(data.dob, 'hi'))}
    ${row(t('Gender'), data.gender ? t(data.gender) : null)}
    ${row(t('Blood group'), data.blood_group)}
    ${row(t('Caste'), data.caste)}
    ${row(t('Mobile'), data.mobile)}
    ${row(t('Home district'), data.home_district?.name_hi)}
    <h2>${t('Service')}</h2>
    ${row(t('Rank'), data.rank ? t(data.rank) : null)}
    ${row(t('Designation'), data.designation ? t(data.designation) : null)}
    ${row(t('Current unit'), data.current_unit?.name_hi)}
    ${row(t('Posting unit / district'), postingLocation(data))}
    ${row(t('Joining date'), formatDisplayDate(data.joining_date, 'hi'))}
    ${row(t('Promotion date'), formatDisplayDate(data.promotion_date, 'hi'))}
    ${row(t('Appointment'), data.appointment)}
    ${row(t('Sport'), data.sport?.name_hi)}
    ${data.playable_sports.length ? `<div class="section"><h2>${t('Playable sports')}</h2>${data.playable_sports.map((sport) => `<div class="row"><span class="label">${sport.name_hi}</span><span class="val">${[sport.role, sport.position, sport.notes].filter(Boolean).join(' · ') || '—'}</span></div>`).join('')}</div>` : ''}
    ${row(t('Home address'), data.home_address)}
    ${row(t('Other notes'), data.other_notes)}
    ${row(t('Player level'), data.player_level ? t(data.player_level) : null)}
    ${row(t('Player category'), data.player_category ? t(data.player_category) : null)}
    ${row(t('Team since'), data.team_since)}
    ${data.status_history.length ? `<h2>${t('Status history')}</h2>
    <table><thead><tr><th>${t('Date')}</th><th>${t('Status')}</th><th>${t('Reason')}</th></tr></thead>
    <tbody>${statusRows}</tbody></table>` : ''}
    ${data.team_history.length ? `<h2>${t('Team history')}</h2>
    <table><thead><tr><th>${t('Team')}</th><th>${t('Session')}</th><th>${t('Role')}</th><th>${t('Joined')}</th><th>${t('Left')}</th></tr></thead>
    <tbody>${teamRows}</tbody></table>` : ''}
    ${data.achievements.length ? `<h2>${t('Achievements')}</h2>
    <table><thead><tr><th>${t('Level')}</th><th>${t('Competition')}</th><th>${t('Event')}</th><th>${t('Medal')}</th><th>${t('Date')}</th></tr></thead>
    <tbody>${achievementRows}</tbody></table>` : ''}
    </body></html>`;
}

export function MemberQuickView({ memberId, open, onClose }: { memberId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<MemberPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, MemberPreview>({});
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open || memberId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(MemberPreviewController.url(memberId), {
            onSuccess: (res) => setData(res as unknown as MemberPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, memberId]);

    const handlePrint = () => {
        if (!data) {
            return;
        }

        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(buildPrintHtml(data, t));
        win.document.close();
        setTimeout(() => {
 win.focus(); win.print();
}, 300);
    };

    const exportUrl = memberId !== null ? exportMembersUrl.url() + '?ids[]=' + memberId : '#';

    return (
        <Sheet open={open} onOpenChange={(v) => {
 if (!v) {
 onClose();
}
}}>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl" ref={printRef}>
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <SheetTitle className="sr-only">{t('Loading…')}</SheetTitle>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">{localizedText(data.full_name_hi, data.full_name_en, 'hi') ?? data.full_name_hi}</SheetTitle>
                            {localizedText(data.full_name_hi, data.full_name_en, 'en') && (
                                <p className="text-sm text-muted-foreground">
                                    {localizedText(data.full_name_hi, data.full_name_en, 'en')}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {data.pno && <span className="font-mono text-xs text-muted-foreground">{data.pno}</span>}
                                {data.rank && <span className="text-xs font-medium">{t(data.rank)}</span>}
                                <Badge variant={STATUS_VARIANT[data.current_status] ?? 'outline'} className="ml-auto">
                                    {t(data.current_status)}
                                </Badge>
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                    )}

                    {data && (
                        <div className="py-2">
                            <Section title={t('Personal')}>
                                <InfoRow label={t("Father's name")} value={data.father_name_hi} />
                                <InfoRow label={t('Date of birth')} value={formatDisplayDate(data.dob, 'hi')} />
                                <InfoRow label={t('Gender')} value={data.gender ? t(data.gender) : null} />
                                <InfoRow label={t('Blood group')} value={data.blood_group} />
                                <InfoRow label={t('Caste')} value={data.caste} />
                                <InfoRow label={t('Mobile')} value={data.mobile} />
                                <InfoRow label={t('Home district')} value={data.home_district?.name_hi} />
                            </Section>

                            <Section title={t('Service')}>
                                <InfoRow label={t('Current unit')} value={data.current_unit?.name_hi} />
                                <InfoRow label={t('Posting unit / district')} value={postingLocation(data)} />
                                <InfoRow label={t('Joining date')} value={formatDisplayDate(data.joining_date, 'hi')} />
                                <InfoRow label={t('Promotion date')} value={formatDisplayDate(data.promotion_date, 'hi')} />
                                <InfoRow label={t('Appointment')} value={data.appointment} />
                                <InfoRow label={t('Designation')} value={data.designation ? t(data.designation) : null} />
                                <InfoRow label={t('Sport')} value={data.sport?.name_hi} />
                                <InfoRow label={t('Home address')} value={data.home_address} />
                                <InfoRow label={t('Other notes')} value={data.other_notes} />
                                <InfoRow label={t('Player level')} value={data.player_level ? t(data.player_level) : null} />
                                <InfoRow label={t('Player category')} value={data.player_category ? t(data.player_category) : null} />
                                <InfoRow label={t('Team since')} value={data.team_since} />

                                {data.playable_sports.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('Playable sports')}</p>
                                        {data.playable_sports.map((sport) => (
                                            <div key={sport.id} className="rounded-md border p-2 text-sm">
                                                <p className="font-medium">{sport.name_hi}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {[sport.role, sport.position, sport.notes].filter(Boolean).join(' · ') || '—'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Section>

                            {data.status_history.length > 0 && (
                                <Section title={t('Status history')}>
                                    <div className="space-y-3">
                                        {data.status_history.map((h, i) => (
                                            <div key={i} className="flex gap-3 text-sm">
                                                <div className="mt-0.5 flex flex-col items-center">
                                                    <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                                                    {i < data.status_history.length - 1 && (
                                                        <span className="mt-1 w-px flex-1 bg-border" />
                                                    )}
                                                </div>
                                                <div className="pb-3">
                                                    <span className="font-mono text-xs text-muted-foreground">{formatDisplayDate(h.effective_on, 'hi')}</span>
                                                    <p className="font-semibold">{t(h.status)}</p>
                                                    {h.reason_hi && <p className="text-muted-foreground">{h.reason_hi}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {data.team_history.length > 0 && (
                                <Section title={t('Team history')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Team')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Joined')}</TableHead>
                                                <TableHead>{t('Left')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.team_history.map((th, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{th.team_name_hi ?? '—'}</TableCell>
                                                    <TableCell>{th.session_name ?? '—'}</TableCell>
                                                    <TableCell>{t(th.role)}</TableCell>
                                                    <TableCell className="font-mono text-xs">{formatDisplayDate(th.joined_on, 'hi') ?? '—'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{formatDisplayDate(th.left_on, 'hi') ?? t('Present')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}

                            {data.achievements.length > 0 && (
                                <Section title={t('Achievements')}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Level')}</TableHead>
                                                <TableHead>{t('Competition')}</TableHead>
                                                <TableHead>{t('Event')}</TableHead>
                                                <TableHead>{t('Medal')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.achievements.map((a, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="whitespace-nowrap text-xs font-medium">{t(a.level)}</TableCell>
                                                    <TableCell className="text-xs">{a.competition_details}</TableCell>
                                                    <TableCell className="text-xs">{a.event ?? '—'}</TableCell>
                                                    <TableCell className={`text-xs font-semibold ${MEDAL_COLOR[a.medal_type ?? ''] ?? ''}`}>
                                                        {a.medal_type ? t(a.medal_type) : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{formatDisplayDate(a.event_date, 'hi') ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Section>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => {
 window.open(exportUrl, '_blank');
}}>
                        {t('Export')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                    {memberId !== null && (
                        <Button asChild size="sm" className="ml-auto">
                            <Link href={MemberController.show.url(memberId)}>
                                <ExternalLink className="mr-1.5 h-4 w-4" />
                                {t('Open profile')}
                            </Link>
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
