import { Deferred, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { destroy, edit as editCoach, index as coachesIndex } from '@/actions/App/Http/Controllers/CoachController';
import { show as exportCoach } from '@/actions/App/Http/Controllers/CoachExportController';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

type LinkedMember = {
    id: number;
    member_code: string;
    full_name: string;
    pno: string | null;
    rank: string | null;
    mobile: string | null;
};

type CoachCertification = {
    id: number;
    name: string;
    certificate_type: string | null;
    issuer: string | null;
    issued_at: string | null;
    expired_at: string | null;
    attachment_path: string | null;
};

type CoachSport = {
    id: number;
    name: string;
    is_primary: boolean;
    level: string | null;
    effective_from: string | null;
    effective_to: string | null;
    notes: string | null;
};

type CoachAssignment = {
    id: number;
    role: string;
    team_name: string | null;
    session_name: string | null;
    is_current: boolean;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
};

type Coach = {
    id: number;
    full_name: string;
    display_name: string | null;
    designation: string | null;
    email: string | null;
    gender: string | null;
    date_of_birth: string | null;
    coach_status: string | null;
    bio: string | null;
    address: string | null;
    pno: string | null;
    mobile: string | null;
    nis_certified: boolean;
    photo_path: string | null;
    member?: LinkedMember | null;
    certifications: CoachCertification[];
    sports: CoachSport[];
    assignment_history: CoachAssignment[];
};

const ALL_COLUMNS = [
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'display_name', label: 'Display Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'nis_certified', label: 'NIS Certified' },
    { key: 'linked_member', label: 'Linked Member Code' },
] as const;

const BASE_STATUS_STYLES: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
    ACTIVE: 'default',
    INACTIVE: 'outline',
    RETIRED: 'secondary',
};

export default function CoachesShow({
    coach,
    auditLog,
}: {
    coach: Coach;
    auditLog?: AuditEntry[];
}) {
    const { t } = useTranslation();

    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
    const [exportMode, setExportMode] = useState<'print' | 'download'>('download');

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

    const assignmentRows = coach.assignment_history?.length > 0
        ? coach.assignment_history
        : [];

    return (
        <>
            <Head title={coach.full_name} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {coach.full_name}
                        </h1>
                        {coach.display_name ? <p className="text-sm text-muted-foreground">{coach.display_name}</p> : null}
                    </div>

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

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex flex-wrap gap-2">
                        {coach.nis_certified ? <Badge>{t('NIS Certified')}</Badge> : <Badge variant="outline">{t('Not NIS Certified')}</Badge>}
                        {coach.coach_status ? <Badge variant={BASE_STATUS_STYLES[coach.coach_status] ?? 'outline'}>{t(coach.coach_status)}</Badge> : null}
                        {coach.designation ? <Badge variant="outline">{coach.designation}</Badge> : null}
                    </div>
                </div>

                <Tabs defaultValue="profile">
                    <TabsList>
                        <TabsTrigger value="profile">{t('Profile')}</TabsTrigger>
                        <TabsTrigger value="certifications">{t('Certifications')}</TabsTrigger>
                        <TabsTrigger value="sports">{t('Sports')}</TabsTrigger>
                        <TabsTrigger value="assignments">{t('Assignment history')}</TabsTrigger>
                        <TabsTrigger value="changelog">{t('Change log')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <div className="space-y-4">
                            <div className="rounded-xl border bg-card p-6">
                                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {detail(t('Display name'), coach.display_name ?? '')}
                                    {detail(t('Designation'), coach.designation ?? '')}
                                    {detail(t('Email'), coach.email ?? '')}
                                    {detail(t('Gender'), coach.gender ?? '')}
                                    {detail(t('Date of birth'), coach.date_of_birth ?? '')}
                                    {detail(t('Address'), coach.address ?? '')}
                                    {detail(t('Status'), coach.coach_status ?? '')}
                                    {detail(t('PNO'), coach.pno ?? '')}
                                    {detail(t('Mobile'), coach.mobile ?? '')}
                                    {detail(t('NIS'), coach.nis_certified ? t('Certified') : t('Not certified'))}
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

                    <TabsContent value="certifications">
                        <div className="rounded-xl border bg-card">
                            {coach.certifications.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">{t('No certifications yet.')}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Issuer')}</TableHead>
                                            <TableHead>{t('Issued')}</TableHead>
                                            <TableHead>{t('Expired')}</TableHead>
                                            <TableHead>{t('Attachment')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coach.certifications.map((certification) => (
                                            <TableRow key={certification.id}>
                                                <TableCell className="font-medium">{certification.name}</TableCell>
                                                <TableCell>{certification.certificate_type ?? ''}</TableCell>
                                                <TableCell>{certification.issuer ?? ''}</TableCell>
                                                <TableCell>{certification.issued_at ?? ''}</TableCell>
                                                <TableCell>{certification.expired_at ?? ''}</TableCell>
                                            <TableCell>{certification.attachment_path ?? ''}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="sports">
                        <div className="rounded-xl border bg-card">
                            {coach.sports.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">{t('No sports specialization yet.')}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>{t('Primary')}</TableHead>
                                            <TableHead>{t('Level')}</TableHead>
                                            <TableHead>{t('From')}</TableHead>
                                            <TableHead>{t('To')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coach.sports.map((sport) => (
                                            <TableRow key={sport.id}>
                                                <TableCell className="font-medium">{sport.name}</TableCell>
                                                <TableCell>{sport.is_primary ? t('Yes') : t('No')}</TableCell>
                                                <TableCell>{sport.level ?? ''}</TableCell>
                                                <TableCell>{sport.effective_from ?? ''}</TableCell>
                                                <TableCell>{sport.effective_to ?? ''}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments">
                        <div className="rounded-xl border bg-card">
                            <Deferred data="auditLog">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>{t('Session')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Current')}</TableHead>
                                            <TableHead>{t('Assigned')}</TableHead>
                                            <TableHead>{t('Removed')}</TableHead>
                                            <TableHead>{t('Notes')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignmentRows.length > 0 ? (
                                            assignmentRows.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell>{assignment.team_name ?? ''}</TableCell>
                                                    <TableCell>{assignment.session_name ?? ''}</TableCell>
                                                    <TableCell>{assignment.role}</TableCell>
                                                    <TableCell>{assignment.is_current ? t('Current') : t('Historical')}</TableCell>
                                                    <TableCell>{assignment.assigned_at ?? ''}</TableCell>
                                                    <TableCell>{assignment.removed_at ?? ''}</TableCell>
                                                    <TableCell>{assignment.notes ?? ''}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                    {t('No assignments yet.')}
                                                </TableCell>
                                            </TableRow>
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
    exportMode: 'print' | 'download';
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
                                            checked ? (previous.includes(col.key) ? previous : [...previous, col.key]) : previous.filter((k) => k !== col.key),
                                        )
                                    }
                                />
                                <Label htmlFor={`coach-${col.key}`}>{t(col.label)}</Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
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
                        {isPrintPrimary ? t('Print') : t('Print preview')}
                    </Button>
                    <Button
                        disabled={selectedColumns.length === 0}
                        onClick={() => {
                            onDownload();
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
