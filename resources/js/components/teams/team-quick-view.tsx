import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import TeamPreviewController from '@/actions/App/Http/Controllers/Api/V1/TeamPreviewController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamsUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type TeamMemberRow = {
    pno: string | null;
    full_name_hi: string | null;
    rank: string | null;
    role: string;
    session_name: string | null;
};

type TeamCoachRow = {
    full_name_hi: string | null;
    pno: string | null;
    nis_certified: boolean;
    role: string;
    session_name: string | null;
};

type TeamPreview = {
    id: number;
    name_hi: string;
    in_charge_hi: string | null;
    players_count: number;
    coaches_count: number;
    sport: { name_hi: string } | null;
    session: { name: string } | null;
    unit: { name_hi: string } | null;
    members: TeamMemberRow[];
    coaches: TeamCoachRow[];
};

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

function buildPrintHtml(data: TeamPreview, t: (k: string) => string): string {
    const memberRows = data.members.map(
        (m) => `<tr><td class="mono">${m.pno ?? '—'}</td><td>${m.full_name_hi ?? '—'}</td><td>${m.rank ? t(m.rank) : '—'}</td><td>${t(m.role)}</td><td>${m.session_name ?? '—'}</td></tr>`,
    ).join('');

    const coachRows = data.coaches.map(
        (c) => `<tr><td>${c.full_name_hi ?? '—'}</td><td class="mono">${c.pno ?? '—'}</td><td>${c.nis_certified ? '✓' : '—'}</td><td>${t(c.role)}</td><td>${c.session_name ?? '—'}</td></tr>`,
    ).join('');

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.name_hi}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:13px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:14px 0 4px;border-bottom:1px solid #ddd;padding-bottom:2px}
        .header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:4px}
        .row{display:grid;grid-template-columns:150px 1fr;gap:4px;padding:1px 0}
        .label{color:#555}.val{font-weight:500}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{background:#f0f0f0;text-align:left;padding:4px 8px;font-size:12px;border:1px solid #ccc}
        td{padding:4px 8px;border:1px solid #ccc;font-size:12px}
        .mono{font-family:monospace}
        @media print{@page{margin:1cm}}
    </style></head><body>
    <div class="header">
        <h1>${data.name_hi}</h1>
    </div>
    <h2>${t('Team info')}</h2>
    ${data.sport ? `<div class="row"><span class="label">${t('Sport')}</span><span class="val">${data.sport.name_hi}</span></div>` : ''}
    ${data.session ? `<div class="row"><span class="label">${t('Session')}</span><span class="val">${data.session.name}</span></div>` : ''}
    ${data.unit ? `<div class="row"><span class="label">${t('Unit')}</span><span class="val">${data.unit.name_hi}</span></div>` : ''}
    ${data.in_charge_hi ? `<div class="row"><span class="label">${t('In-charge')}</span><span class="val">${data.in_charge_hi}</span></div>` : ''}
    ${data.members.length ? `<h2>${t('Players')} (${data.members.length})</h2>
    <table><thead><tr><th>${t('PNO')}</th><th>${t('Name')}</th><th>${t('Rank')}</th><th>${t('Role')}</th><th>${t('Session')}</th></tr></thead>
    <tbody>${memberRows}</tbody></table>` : ''}
    ${data.coaches.length ? `<h2>${t('Coaches')} (${data.coaches.length})</h2>
    <table><thead><tr><th>${t('Name')}</th><th>${t('PNO')}</th><th>${t('NIS')}</th><th>${t('Role')}</th><th>${t('Session')}</th></tr></thead>
    <tbody>${coachRows}</tbody></table>` : ''}
    </body></html>`;
}

export function TeamQuickView({ teamId, open, onClose }: { teamId: number | null; open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [data, setData] = useState<TeamPreview | null>(null);
    const [error, setError] = useState(false);
    const { get, processing } = useHttp<Record<string, never>, TeamPreview>({});

    useEffect(() => {
        if (!open || teamId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(TeamPreviewController.url(teamId), {
            onSuccess: (res) => setData(res as unknown as TeamPreview),
            onError: () => setError(true),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, teamId]);

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

    const exportUrl = teamId !== null ? exportTeamsUrl.url() + '?ids[]=' + teamId : '#';

    return (
        <Sheet open={open} onOpenChange={(v) => {
 if (!v) {
 onClose();
}
}}>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <SheetTitle className="sr-only">{t('Loading…')}</SheetTitle>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">{data.name_hi}</SheetTitle>
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-muted-foreground">
                                {data.sport && <span>{data.sport.name_hi}</span>}
                                {data.session && <span>· {data.session.name}</span>}
                                {data.unit && <span>· {data.unit.name_hi}</span>}
                            </div>
                            <div className="flex gap-4 pt-1 text-sm">
                                <span><span className="font-semibold">{data.players_count}</span> {t('players')}</span>
                                <span><span className="font-semibold">{data.coaches_count}</span> {t('coaches')}</span>
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">{t('Could not load details.')}</p>
                    )}

                    {data && (
                        <div className="py-2">
                            <div className="border-b py-4">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Team info')}</h3>
                                <InfoRow label={t('In-charge')} value={data.in_charge_hi} />
                            </div>

                            {data.members.length > 0 && (
                                <div className="border-b py-4 last:border-0">
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {t('Players')} ({data.members.length})
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('PNO')}</TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Rank')}</TableHead>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.members.map((m, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-xs">{m.pno ?? '—'}</TableCell>
                                                    <TableCell className="font-medium">{m.full_name_hi ?? '—'}</TableCell>
                                                    <TableCell className="text-xs">{m.rank ? t(m.rank) : '—'}</TableCell>
                                                    <TableCell className="text-xs">{t(m.role)}</TableCell>
                                                    <TableCell className="text-xs">{m.session_name ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {data.coaches.length > 0 && (
                                <div className="py-4">
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {t('Coaches')} ({data.coaches.length})
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('PNO')}</TableHead>
                                                <TableHead>{t('NIS')}</TableHead>
                                                <TableHead>{t('Role')}</TableHead>
                                                <TableHead>{t('Session')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.coaches.map((c, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{c.full_name_hi ?? '—'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{c.pno ?? '—'}</TableCell>
                                                    <TableCell className="text-xs">{c.nis_certified ? '✓' : '—'}</TableCell>
                                                    <TableCell className="text-xs">{t(c.role)}</TableCell>
                                                    <TableCell className="text-xs">{c.session_name ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
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
                    {teamId !== null && (
                        <Button asChild size="sm" className="ml-auto">
                            <Link href={TeamController.show.url(teamId)}>
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
