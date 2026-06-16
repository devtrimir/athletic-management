import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { destroy, edit as editCoach, index as coachesIndex } from '@/actions/App/Http/Controllers/CoachController';
import { show as exportCoach } from '@/actions/App/Http/Controllers/CoachExportController';
import { show as showTeam } from '@/actions/App/Http/Controllers/TeamController';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

const ALL_COLUMNS = [
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'nis_certified', label: 'NIS Certified' },
    { key: 'linked_member', label: 'Linked Member Code' },
] as const;

type Coach = {
    id: number;
    full_name: string;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    member?: LinkedMember | null;
};

type LinkedMember = {
    id: number;
    member_code: string;
    full_name: string;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
};

type CoachTeamRow = {
    id: number;
    role: string | null;
    team: { id: number; name: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type ExportMode = 'print' | 'download';

export default function CoachesShow({
    coach,
    coachTeams,
    auditLog,
}: {
    coach: Coach;
    coachTeams?: CoachTeamRow[];
    auditLog?: AuditEntry[];
}) {
    const { t } = useTranslation();

    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
    const [exportMode, setExportMode] = useState<ExportMode>('download');

    const linkedMember = coach.member ?? null;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name },
        ],
    });

    const printableColumns = useMemo(() => ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key)), [selectedColumns]);

    function exportValue(key: string): string {
        if (key === 'nis_certified') {
            return coach.nis_certified ? t('NIS Certified') : '';
        }

        if (key === 'linked_member') {
            return linkedMember?.member_code ?? '';
        }

        const raw = (coach as Record<string, unknown>)[key];

        return raw === null || raw === '' || raw === undefined ? '' : String(raw);
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportCoach.url(coach) + '?' + params.toString();
    }

    function handlePrint() {
        const headers = printableColumns.map((c) => `<th>${t(c.label)}</th>`).join('');
        const rows = `<tr>${printableColumns.map((c) => `<td>${exportValue(c.key)}</td>`).join('')}</tr>`;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Coach Profile')}</title><style>body{font-family:sans-serif;font-size:12px;padding:16px}h2{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Coach Profile')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
    }

    const onPrimaryExport = () => {
        if (exportMode === 'print') {
            handlePrint();

            return;
        }

        window.location.href = buildExportUrl();
    };

    function handleDelete() {
        if (!confirm(t('Delete this coach?'))) {
            return;
        }

        router.delete(destroy.url(coach));
    }

    const detail = (label: string, value: string) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
        </div>
    );

    return (
        <>
            <Head title={coach.full_name} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">{coach.full_name}</h1>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => {
                            setExportMode('print');
                            setExportOpen(true);
                        }}>
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print preview')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                            setExportMode('download');
                            setExportOpen(true);
                        }}>
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Export')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editCoach.url(coach)}>{t('Edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            {t('Delete')}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger
                            value="overview"
                        >
                            {t('Overview')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="assignments"
                        >
                            {t('Assignments')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="changelog"
                        >
                            {t('Change log')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="space-y-4">
                            <div className="rounded-xl border bg-card p-6">
                                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {detail(t('PNO'), coach.pno ?? '')}
                                    {detail(t('Mobile'), coach.mobile ?? '')}
                                    {detail(
                                        t('NIS'),
                                        coach.nis_certified ? t('NIS certified') : t('Not NIS certified'),
                                    )}
                                </dl>
                            </div>

                            <div className="rounded-xl border bg-card p-6">
                                <h3 className="mb-4 text-sm font-medium text-muted-foreground">{t('Linked member')}</h3>
                                {linkedMember ? (
                                    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                        {detail(t('Member code'), linkedMember.member_code ?? '')}
                                        {detail(t('Name'), linkedMember.full_name ?? '')}
                                        {detail(t('PNO'), linkedMember.pno ?? '')}
                                        {detail(t('Rank'), linkedMember.rank ?? '')}
                                        {detail(t('Mobile'), linkedMember.mobile ?? '')}
                                    </dl>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{t('No linked member.')}</p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments">
                        <div className="rounded-xl border bg-card">
                            <Deferred
                                data="coachTeams"
                                fallback={
                                    <div className="space-y-2 p-4">
                                        {[1, 2, 3].map((n) => (
                                            <div key={n} className="h-10 w-full animate-pulse rounded bg-muted" />
                                        ))}
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(coachTeams ?? []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    {t('No assignments yet.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (coachTeams ?? []).map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">
                                                        {row.team ? (
                                                            <Link href={showTeam.url(row.team)} className="hover:underline">
                                                                {row.team.name}
                                                            </Link>
                                                        ) : (
                                                            ''
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{row.sport?.name ?? ''}</TableCell>
                                                    <TableCell>{row.session?.name ?? ''}</TableCell>
                                                    <TableCell>{row.role ?? ''}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    <TabsContent value="changelog">
                        <Deferred
                            data="auditLog"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <div key={n} className="h-14 w-full animate-pulse rounded bg-muted" />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog entries={auditLog} primaryEntity="Coach" storageKey="coach-changelog-view" />
                        </Deferred>
                    </TabsContent>
                </Tabs>
            </div>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                onPrimaryExport={onPrimaryExport}
                onPrint={handlePrint}
                onDownload={() => (window.location.href = buildExportUrl())}
                exportMode={exportMode}
                t={t}
            />
        </>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    selectedColumns,
    setSelectedColumns,
    onPrimaryExport,
    onPrint,
    onDownload,
    exportMode,
    t,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedColumns: string[];
    setSelectedColumns: Dispatch<SetStateAction<string[]>>;
    onPrimaryExport: () => void;
    onPrint: () => void;
    onDownload: () => void;
    exportMode: ExportMode;
    t: (key: string) => string;
}) {
    const isPrintPrimary = exportMode === 'print';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Export coach')}</DialogTitle>
                    <DialogDescription>
                        {t('Choose columns, then print or download the current view.')}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
                    <p className="mb-3 text-sm font-medium">{t('Select columns to export')}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ALL_COLUMNS.map((col) => (
                            <div key={col.key} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`coach-${col.key}`}
                                        checked={selectedColumns.includes(col.key)}
                                        onCheckedChange={(checked) =>
                                            setSelectedColumns((previous) =>
                                                checked
                                                    ? previous.includes(col.key)
                                                        ? previous
                                                        : [...previous, col.key]
                                                    : previous.filter((k) => k !== col.key),
                                            )
                                        }
                                    />
                                <Label htmlFor={`coach-${col.key}`}>{t(col.label)}</Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        variant={isPrintPrimary ? 'outline' : 'default'}
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            onPrimaryExport();
                            onOpenChange(false);
                        }}
                    >
                        {isPrintPrimary ? (
                            <>
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print')}
                            </>
                        ) : (
                            <>
                                <Download className="mr-1.5 h-4 w-4" />
                                {t('Download Excel')}
                            </>
                        )}
                    </Button>
                    <Button
                        variant={isPrintPrimary ? 'default' : 'outline'}
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            if (isPrintPrimary) {
                                onDownload();
                            } else {
                                onPrint();
                            }

                            onOpenChange(false);
                        }}
                    >
                        {isPrintPrimary ? (
                            <>
                                <Download className="mr-1.5 h-4 w-4" />
                                {t('Download Excel')}
                            </>
                        ) : (
                            <>
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
