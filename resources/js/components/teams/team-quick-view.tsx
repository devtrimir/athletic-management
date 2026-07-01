import { Link } from '@inertiajs/react';
import { useHttp } from '@inertiajs/react';
import { CalendarDays, ExternalLink, Printer } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import TeamPreviewController from '@/actions/App/Http/Controllers/Api/V1/TeamPreviewController';
import TeamController from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamsUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';

type TeamMemberRow = {
    pno: string | null;
    full_name: string | null;
    rank: string | null;
    role: string;
    session_name: string | null;
};

type TeamCoachRow = {
    full_name: string | null;
    pno: string | null;
    nis_certified: boolean;
    role: string;
    session_name: string | null;
};

type TeamPreview = {
    id: number;
    name: string;
    in_charge: string | null;
    location_type: 'unit' | 'district';
    location_label: string | null;
    is_active: boolean;
    players_count: number;
    coaches_count: number;
    sport: { name: string } | null;
    session: { name: string } | null;
    district: { name: string } | null;
    unit: { name: string } | null;
    members: TeamMemberRow[];
    coaches: TeamCoachRow[];
};

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
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
    const formatMemberName = (member: TeamMemberRow) => {
        const rankLabel = member.rank ? t(member.rank) : '';
        const fullName = member.full_name ?? '';

        return rankLabel ? `${rankLabel} ${fullName}` : fullName;
    };

    const memberRows = data.members
        .map(
            (m) =>
                `<tr><td class="mono">${m.pno ?? '—'}</td><td>${formatMemberName(m)}</td><td>${t(m.role)}</td><td>${m.session_name ?? '—'}</td></tr>`,
        )
        .join('');

    const coachRows = data.coaches
        .map(
            (c) =>
                `<tr><td>${c.full_name ?? '—'}</td><td class="mono">${c.pno ?? '—'}</td><td>${c.nis_certified ? '✓' : '—'}</td><td>${t(c.role)}</td><td>${c.session_name ?? '—'}</td></tr>`,
        )
        .join('');

    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${data.name}</title>
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
        <h1>${data.name}</h1>
    </div>
    <h2>${t('Team info')}</h2>
    ${data.sport ? `<div class="row"><span class="label">${t('Sport')}</span><span class="val">${data.sport.name}</span></div>` : ''}
    ${data.session ? `<div class="row"><span class="label">${t('Session')}</span><span class="val">${data.session.name}</span></div>` : ''}
    ${data.location_label ? `<div class="row"><span class="label">${t('Location')}</span><span class="val">${data.location_label}</span></div>` : ''}
    <div class="row"><span class="label">${t('Status')}</span><span class="val">${data.is_active ? t('Active') : t('Inactive')}</span></div>
    ${data.in_charge ? `<div class="row"><span class="label">${t('In-charge')}</span><span class="val">${data.in_charge}</span></div>` : ''}
    ${
        data.members.length
            ? `<h2>${t('Players')} (${data.members.length})</h2>
    <table><thead><tr><th>${t('PNO')}</th><th>${t('Name')}</th><th>${t('Role')}</th><th>${t('Session')}</th></tr></thead>
    <tbody>${memberRows}</tbody></table>`
            : ''
    }
    ${
        data.coaches.length
            ? `<h2>${t('Coaches')} (${data.coaches.length})</h2>
    <table><thead><tr><th>${t('Name')}</th><th>${t('PNO')}</th><th>${t('NIS')}</th><th>${t('Role')}</th><th>${t('Session')}</th></tr></thead>
    <tbody>${coachRows}</tbody></table>`
            : ''
    }
    </body></html>`;
}

export function TeamQuickView({
    teamId,
    open,
    sessionId,
    sessionName,
    historical = false,
    onClose,
}: {
    teamId: number | null;
    open: boolean;
    sessionId?: string | null;
    sessionName?: string | null;
    historical?: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [data, setData] = useState<TeamPreview | null>(null);
    const [error, setError] = useState(false);

    function memberNameWithRank(member: TeamMemberRow): string {
        const rankLabel = member.rank ? t(member.rank) : '';

        return rankLabel
            ? `${rankLabel} ${member.full_name ?? ''}`
            : (member.full_name ?? '');
    }
    const { get, processing } = useHttp<Record<string, never>, TeamPreview>({});
    const selectedSessionName = sessionName ?? data?.session?.name ?? null;
    const hasHistoricalSession = historical;

    useEffect(() => {
        if (!open || teamId === null) {
            return;
        }

        startTransition(() => {
            setData(null);
            setError(false);
        });
        get(
            TeamPreviewController.url(teamId, {
                query: sessionId
                    ? {
                          'filter[session_id]': sessionId,
                      }
                    : undefined,
            }),
            {
                onSuccess: (res) => setData(res as unknown as TeamPreview),
                onError: () => setError(true),
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, teamId, sessionId]);

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
            win.focus();
            win.print();
        }, 300);
    };

    const exportUrl =
        teamId !== null ? exportTeamsUrl.url() + '?ids[]=' + teamId : '#';
    const openProfileUrl =
        teamId !== null
            ? TeamController.show.url(teamId, {
                  query: sessionId ? { 'filter[session_id]': sessionId } : {},
              })
            : '#';

    return (
        <Sheet
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    onClose();
                }
            }}
        >
            <SheetContent
                side="right"
                className="flex w-full flex-col sm:max-w-2xl"
            >
                <SheetHeader className="border-b pb-4">
                    {processing || !data ? (
                        <div className="space-y-2">
                            <SheetTitle className="sr-only">
                                {t('Loading…')}
                            </SheetTitle>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ) : (
                        <>
                            <SheetTitle className="text-lg">
                                {data.name}
                            </SheetTitle>
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-muted-foreground">
                                {data.sport && <span>{data.sport.name}</span>}
                                {selectedSessionName && (
                                    <span>· {selectedSessionName}</span>
                                )}
                                {data.location_label && (
                                    <span>· {data.location_label}</span>
                                )}
                                <Badge
                                    variant="secondary"
                                    className={
                                        hasHistoricalSession
                                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    }
                                >
                                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                    {hasHistoricalSession
                                        ? t('Archived session')
                                        : t('Active session')}
                                </Badge>
                            </div>
                            <div className="flex gap-4 pt-1 text-sm">
                                <span>
                                    <span className="font-semibold">
                                        {data.players_count}
                                    </span>{' '}
                                    {t('players')}
                                </span>
                                <span>
                                    <span className="font-semibold">
                                        {data.coaches_count}
                                    </span>{' '}
                                    {t('coaches')}
                                </span>
                            </div>
                        </>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {processing && (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    )}

                    {error && (
                        <p className="py-8 text-center text-sm text-destructive">
                            {t('Could not load details.')}
                        </p>
                    )}

                    {data && (
                        <div className="py-2">
                            <div className="border-b py-4">
                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {t('Team info')}
                                </h3>
                                <InfoRow
                                    label={t('In-charge')}
                                    value={data.in_charge}
                                />
                                <InfoRow
                                    label={t('Location')}
                                    value={data.location_label}
                                />
                                <InfoRow
                                    label={t('Status')}
                                    value={
                                        data.is_active
                                            ? t('Active')
                                            : t('Inactive')
                                    }
                                />
                            </div>

                            {data.members.length > 0 && (
                                <div className="border-b py-4 last:border-0">
                                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Players')} ({data.members.length})
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('PNO')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Role')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.members.map((m, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-xs">
                                                        {m.pno ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {memberNameWithRank(m)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t(m.role)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {m.session_name ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {data.coaches.length > 0 && (
                                <div className="py-4">
                                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Coaches')} ({data.coaches.length})
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('PNO')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('NIS')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Role')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Session')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.coaches.map((c, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">
                                                        {c.full_name ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {c.pno ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {c.nis_certified
                                                            ? '✓'
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t(c.role)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {c.session_name ?? '—'}
                                                    </TableCell>
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            window.open(exportUrl, '_blank');
                        }}
                    >
                        {t('Export')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        disabled={!data}
                    >
                        <Printer className="mr-1.5 h-4 w-4" />
                        {t('Print')}
                    </Button>
                    {teamId !== null && (
                        <Button asChild size="sm" className="ml-auto">
                            <Link href={openProfileUrl}>
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
