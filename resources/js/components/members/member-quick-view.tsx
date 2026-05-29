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
    member_code: string;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    father_name_hi: string | null;
    rank: string | null;
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
    sport_event: string | null;
    team_since: string | null;
    home_district: { name_hi: string } | null;
    current_unit: { name_hi: string } | null;
    sport: { name_hi: string } | null;
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

function buildPrintHtml(data: MemberPreview, t: (k: string) => string): string {
    const row = (label: string, value: string | null | undefined) =>
        value ? `<div class="row"><span class="label">${label}</span><span class="val">${value}</span></div>` : '';

    const statusRows = data.status_history.map(
        (h) =>
            `<tr><td>${h.effective_on}</td><td>${t(h.status)}</td><td>${h.reason_hi ?? '—'}</td></tr>`,
    ).join('');

    const teamRows = data.team_history.map(
        (th) =>
            `<tr><td>${th.team_name_hi ?? '—'}</td><td>${th.session_name ?? '—'}</td><td>${t(th.role)}</td><td>${th.joined_on ?? '—'}</td><td>${th.left_on ?? t('Present')}</td></tr>`,
    ).join('');

    const achievementRows = data.achievements.map(
        (a) =>
            `<tr><td>${t(a.level)}</td><td>${a.competition_details}</td><td>${a.event ?? '—'}</td><td>${a.medal_type ? t(a.medal_type) : '—'}</td><td>${a.event_date ?? '—'}</td></tr>`,
    ).join('');

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.full_name_hi}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:13px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:14px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}
        .header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:4px}
        .meta{font-size:12px;color:#555;font-family:monospace}
        .row{display:grid;grid-template-columns:150px 1fr;gap:4px;padding:1px 0}
        .label{color:#555}.val{font-weight:500}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{background:#f0f0f0;text-align:left;padding:4px 8px;font-size:12px;border:1px solid #ccc}
        td{padding:4px 8px;border:1px solid #ccc;font-size:12px}
        @media print{@page{margin:1cm}}
    </style>
    </head><body>
    <div class="header">
        <h1>${data.full_name_hi}${data.full_name_en ? ` <small>(${data.full_name_en})</small>` : ''}</h1>
        <span class="meta">${data.member_code}${data.pno ? ' · ' + data.pno : ''} · ${t(data.current_status)}</span>
    </div>
    <h2>${t('Personal')}</h2>
    ${row(t("Father's name"), data.father_name_hi)}
    ${row(t('Date of birth'), data.dob)}
    ${row(t('Gender'), data.gender ? t(data.gender) : null)}
    ${row(t('Blood group'), data.blood_group)}
    ${row(t('Caste'), data.caste)}
    ${row(t('Mobile'), data.mobile)}
    ${row(t('Home district'), data.home_district?.name_hi)}
    <h2>${t('Service')}</h2>
    ${row(t('Rank'), data.rank ? t(data.rank) : null)}
    ${row(t('Current unit'), data.current_unit?.name_hi)}
    ${row(t('Joining date'), data.joining_date)}
    ${row(t('Promotion date'), data.promotion_date)}
    ${row(t('Recruitment type'), data.recruitment_type ? t(data.recruitment_type) : null)}
    ${row(t('Appointment'), data.appointment)}
    ${row(t('Sport'), data.sport?.name_hi)}
    ${row(t('Sport event'), data.sport_event)}
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
                            <SheetTitle className="text-lg">{data.full_name_hi}</SheetTitle>
                            {data.full_name_en && (
                                <p className="text-sm text-muted-foreground">{data.full_name_en}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="font-mono text-xs text-muted-foreground">{data.member_code}</span>
                                {data.pno && <span className="font-mono text-xs text-muted-foreground">· {data.pno}</span>}
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
                                <InfoRow label={t('Date of birth')} value={data.dob} />
                                <InfoRow label={t('Gender')} value={data.gender ? t(data.gender) : null} />
                                <InfoRow label={t('Blood group')} value={data.blood_group} />
                                <InfoRow label={t('Caste')} value={data.caste} />
                                <InfoRow label={t('Mobile')} value={data.mobile} />
                                <InfoRow label={t('Home district')} value={data.home_district?.name_hi} />
                            </Section>

                            <Section title={t('Service')}>
                                <InfoRow label={t('Current unit')} value={data.current_unit?.name_hi} />
                                <InfoRow label={t('Joining date')} value={data.joining_date} />
                                <InfoRow label={t('Promotion date')} value={data.promotion_date} />
                                <InfoRow label={t('Recruitment type')} value={data.recruitment_type ? t(data.recruitment_type) : null} />
                                <InfoRow label={t('Appointment')} value={data.appointment} />
                                <InfoRow label={t('Sport')} value={data.sport?.name_hi} />
                                <InfoRow label={t('Sport event')} value={data.sport_event} />
                                <InfoRow label={t('Player level')} value={data.player_level ? t(data.player_level) : null} />
                                <InfoRow label={t('Player category')} value={data.player_category ? t(data.player_category) : null} />
                                <InfoRow label={t('Team since')} value={data.team_since} />
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
                                                    <span className="font-mono text-xs text-muted-foreground">{h.effective_on}</span>
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
                                                    <TableCell className="font-mono text-xs">{th.joined_on ?? '—'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{th.left_on ?? t('Present')}</TableCell>
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
                                                    <TableCell className="font-mono text-xs">{a.event_date ?? '—'}</TableCell>
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
