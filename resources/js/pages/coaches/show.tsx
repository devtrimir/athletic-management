import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
} from '@inertiajs/react';
import { ArrowLeft, Camera, Download, Printer, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import {
    destroy,
    edit as editCoach,
    index as coachesIndex,
    show as coachOverview,
} from '@/actions/App/Http/Controllers/CoachController';
import { show as exportCoach } from '@/actions/App/Http/Controllers/CoachExportController';
import {
    destroy as destroyCoachPhoto,
    store as storeCoachPhoto,
} from '@/actions/App/Http/Controllers/CoachPhotoController';
import {
    achievements as coachAchievements,
    assignments as coachAssignments,
    certifications as coachCertifications,
    changelog as coachChangelog,
    events as coachEvents,
    media as coachMedia,
    performance as coachPerformance,
    promotions as coachPromotions,
    sports as coachSports,
    status as coachStatus,
} from '@/actions/App/Http/Controllers/CoachProfileTabController';
import { store as storeCoachStatus } from '@/actions/App/Http/Controllers/CoachStatusController';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';

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
    team?: { id: number; name: string } | null;
    session?: { id: number; name: string } | null;
    is_current: boolean;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
};

type CoachStatusHistory = {
    id: number;
    status: string;
    effective_on: string;
    reason: string | null;
    recorded_by_name: string | null;
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
    team_activity_status?: 'active' | 'inactive';
    certifications?: CoachCertification[];
    sports?: CoachSport[];
    assignment_history?: CoachAssignment[];
    status_history?: CoachStatusHistory[];
};

type CoachShowTab =
    | 'overview'
    | 'assignments'
    | 'sports'
    | 'certifications'
    | 'events'
    | 'achievements'
    | 'performance'
    | 'promotions'
    | 'media'
    | 'changelog'
    | 'status';

const COACH_SHOW_TABS: CoachShowTab[] = [
    'overview',
    'assignments',
    'sports',
    'certifications',
    'events',
    'achievements',
    'performance',
    'promotions',
    'media',
    'changelog',
    'status',
];

const ALL_COLUMNS = [
    { key: 'pno', label: 'PNO' },
    { key: 'full_name', label: 'Name' },
    { key: 'display_name', label: 'Display Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'nis_certified', label: 'NIS Certified' },
] as const;

const BASE_STATUS_STYLES: Record<
    string,
    'default' | 'outline' | 'secondary' | 'destructive'
> = {
    ACTIVE: 'default',
    INACTIVE: 'outline',
    RETIRED: 'secondary',
    TRANSFERRED: 'secondary',
    RESIGNED: 'outline',
    DISMISSED: 'destructive',
    DECEASED: 'destructive',
    SUSPENDED: 'destructive',
};

const COACH_STATUSES = [
    'ACTIVE',
    'INACTIVE',
    'TRANSFERRED',
    'RETIRED',
    'RESIGNED',
    'DISMISSED',
    'DECEASED',
    'SUSPENDED',
] as const;
function genderLabel(
    gender: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (gender) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return gender ?? '';
    }
}

export default function CoachesShow({
    coach,
    activeTab: activeTabProp = 'overview',
    coachTeams,
    statusHistory,
    auditLog,
}: {
    coach: Coach;
    activeTab?: CoachShowTab;
    coachTeams?: CoachAssignment[];
    statusHistory?: CoachStatusHistory[];
    auditLog?: AuditEntry[];
}) {
    const { t } = useTranslation();

    const [exportOpen, setExportOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );
    const [exportMode, setExportMode] = useState<'print' | 'download'>(
        'download',
    );
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const activeTab = COACH_SHOW_TABS.includes(activeTabProp)
        ? activeTabProp
        : 'overview';

    setLayoutProps({
        breadcrumbs: [
            { title: t('Coaches'), href: coachesIndex.url() },
            { title: coach.full_name },
        ],
    });

    const printableColumns = useMemo(
        () => ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key)),
        [selectedColumns],
    );

    function exportValue(key: string): string {
        if (key === 'nis_certified') {
            return coach.nis_certified ? t('NIS Certified') : '';
        }

        const raw = (coach as Record<string, unknown>)[key];

        return raw === null || raw === '' || raw === undefined
            ? ''
            : String(raw);
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportCoach.url(coach) + '?' + params.toString();
    }

    function handlePrint() {
        const headers = printableColumns
            .map((c) => `<th>${t(c.label)}</th>`)
            .join('');
        const rows = `<tr>${printableColumns.map((c) => `<td>${exportValue(c.key)}</td>`).join('')}</tr>`;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('Coach Profile')}</title><style>body{font-family:sans-serif;font-size:12px;padding:16px}h2{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>${t('Coach Profile')}</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
    }

    function handleDelete() {
        router.delete(destroy.url(coach));
        setDeleteOpen(false);
    }

    function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            storeCoachPhoto.url(coach),
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    event.target.value = '';
                },
            },
        );
    }

    function handleRemovePhoto() {
        router.delete(destroyCoachPhoto.url(coach), { preserveScroll: true });
    }

    const detail = (label: string, value: string) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm text-foreground">{value}</dd>
        </div>
    );

    const assignmentRows =
        activeTab === 'assignments'
            ? (coachTeams ?? coach.assignment_history ?? [])
            : [];
    const statusRows = statusHistory ?? coach.status_history ?? [];
    const teamActivityStatus = coach.team_activity_status ?? 'inactive';

    return (
        <>
            <Head title={coach.full_name} />

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {coach.full_name}
                        </h1>
                        {coach.display_name ? (
                            <p className="text-sm text-muted-foreground">
                                {coach.display_name}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={coachesIndex.url()}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setExportMode('print');
                                setExportOpen(true);
                            }}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print preview')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setExportMode('download');
                                setExportOpen(true);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Export')}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={editCoach.url(coach)}>{t('Edit')}</Link>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                        >
                            {t('Delete')}
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                {coach.photo_path ? (
                                    <img
                                        src={`/storage/${coach.photo_path}`}
                                        alt={coach.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Camera className="h-7 w-7 text-muted-foreground" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {coach.nis_certified ? (
                                        <Badge>{t('NIS Certified')}</Badge>
                                    ) : (
                                        <Badge variant="outline">
                                            {t('Not NIS Certified')}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant={
                                            teamActivityStatus === 'active'
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        {teamActivityStatus === 'active'
                                            ? t('Active')
                                            : t('Inactive')}
                                    </Badge>
                                    {coach.coach_status ? (
                                        <Badge
                                            variant="outline"
                                        >
                                            {t('Profile')}: {t(coach.coach_status)}
                                        </Badge>
                                    ) : null}
                                    {coach.designation ? (
                                        <Badge variant="outline">
                                            {coach.designation}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {coach.pno
                                        ? `${t('PNO')}: ${coach.pno}`
                                        : t('Coach profile')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => photoInputRef.current?.click()}
                            >
                                <Camera className="mr-1.5 h-4 w-4" />
                                {t('Upload photo')}
                            </Button>
                            {coach.photo_path ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemovePhoto}
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    {t('Remove photo')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab}>
                    <TabsList className="flex-wrap justify-start overflow-x-visible">
                        <TabsTrigger value="overview" asChild>
                            <Link href={coachOverview.url(coach)}>
                                {t('Overview')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" asChild>
                            <Link href={coachAssignments.url(coach)}>
                                {t('Teams')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="sports" asChild>
                            <Link href={coachSports.url(coach)}>
                                {t('Sports')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="certifications" asChild>
                            <Link href={coachCertifications.url(coach)}>
                                {t('Certifications')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="events" asChild>
                            <Link href={coachEvents.url(coach)}>
                                {t('Coached Events')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="achievements" asChild>
                            <Link href={coachAchievements.url(coach)}>
                                {t('Achievements')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="performance" asChild>
                            <Link href={coachPerformance.url(coach)}>
                                {t('Performance')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="promotions" asChild>
                            <Link href={coachPromotions.url(coach)}>
                                {t('Promotions & Rewards')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="media" asChild>
                            <Link href={coachMedia.url(coach)}>
                                {t('Media')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="changelog" asChild>
                            <Link href={coachChangelog.url(coach)}>
                                {t('Change log')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="status" asChild>
                            <Link href={coachStatus.url(coach)}>
                                {t('Status history')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="space-y-4">
                            <div className="rounded-xl border bg-card p-6">
                                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {detail(
                                        t('Display name'),
                                        coach.display_name ?? '',
                                    )}
                                    {detail(
                                        t('Designation'),
                                        coach.designation ?? '',
                                    )}
                                    {detail(t('Email'), coach.email ?? '')}
                                    {detail(
                                        t('Gender'),
                                        genderLabel(coach.gender, t),
                                    )}
                                    {detail(
                                        t('Date of birth'),
                                        coach.date_of_birth ?? '',
                                    )}
                                    {detail(t('Address'), coach.address ?? '')}
                                    {detail(
                                        t('Team status'),
                                        teamActivityStatus === 'active'
                                            ? t('Active')
                                            : t('Inactive'),
                                    )}
                                    {detail(
                                        t('Profile status'),
                                        coach.coach_status ?? '',
                                    )}
                                    {detail(t('PNO'), coach.pno ?? '')}
                                    {detail(t('Mobile'), coach.mobile ?? '')}
                                    {detail(
                                        t('NIS'),
                                        coach.nis_certified
                                            ? t('Certified')
                                            : t('Not certified'),
                                    )}
                                </dl>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="certifications">
                        <div className="rounded-xl border bg-card">
                            {(coach.certifications ?? []).length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    {t('No certifications yet.')}
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Issuer')}</TableHead>
                                            <TableHead>{t('Issued')}</TableHead>
                                            <TableHead>
                                                {t('Expired')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Attachment')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(coach.certifications ?? []).map(
                                            (certification) => (
                                                <TableRow
                                                    key={certification.id}
                                                >
                                                    <TableCell className="font-medium">
                                                        {certification.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {certification.certificate_type ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {certification.issuer ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {certification.issued_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {certification.expired_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {certification.attachment_path ??
                                                            ''}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="sports">
                        <div className="rounded-xl border bg-card">
                            {(coach.sports ?? []).length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    {t('No sports specialization yet.')}
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>
                                                {t('Primary')}
                                            </TableHead>
                                            <TableHead>{t('Level')}</TableHead>
                                            <TableHead>{t('From')}</TableHead>
                                            <TableHead>{t('To')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(coach.sports ?? []).map((sport) => (
                                            <TableRow key={sport.id}>
                                                <TableCell className="font-medium">
                                                    {sport.name}
                                                </TableCell>
                                                <TableCell>
                                                    {sport.is_primary
                                                        ? t('Yes')
                                                        : t('No')}
                                                </TableCell>
                                                <TableCell>
                                                    {sport.level ?? ''}
                                                </TableCell>
                                                <TableCell>
                                                    {sport.effective_from ?? ''}
                                                </TableCell>
                                                <TableCell>
                                                    {sport.effective_to ?? ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments">
                        <div className="rounded-xl border bg-card">
                            <Deferred
                                data="coachTeams"
                                fallback={
                                    <div className="space-y-2 p-4">
                                        {[1, 2, 3].map((n) => (
                                            <div
                                                key={n}
                                                className="h-12 w-full animate-pulse rounded bg-muted"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>
                                                {t('Session')}
                                            </TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>
                                                {t('Current')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Assigned')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Removed')}
                                            </TableHead>
                                            <TableHead>{t('Notes')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignmentRows.length > 0 ? (
                                            assignmentRows.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell>
                                                        {assignment.team_name ??
                                                            assignment.team
                                                                ?.name ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.session_name ??
                                                            assignment.session
                                                                ?.name ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.role}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.is_current
                                                            ? t('Current')
                                                            : t('Historical')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.assigned_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.removed_at ??
                                                            ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignment.notes ?? ''}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    {t('No assignments yet.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    <TabsContent value="events">
                        <EmptyCoachTab
                            title={t('Coached Events')}
                            message={t('No coached events recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="achievements">
                        <EmptyCoachTab
                            title={t('Achievements')}
                            message={t('No coach achievements recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="performance">
                        <EmptyCoachTab
                            title={t('Performance')}
                            message={t('No performance records recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="promotions">
                        <EmptyCoachTab
                            title={t('Promotions & Rewards')}
                            message={t('No coach promotions or rewards recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="media">
                        <EmptyCoachTab
                            title={t('Media')}
                            message={t('No media files recorded yet.')}
                        />
                    </TabsContent>

                    <TabsContent value="changelog">
                        <Deferred
                            data="auditLog"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <div
                                            key={n}
                                            className="h-14 w-full animate-pulse rounded bg-muted"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog
                                entries={auditLog}
                                primaryEntity="Coach"
                                storageKey="coach-changelog-view"
                            />
                        </Deferred>
                    </TabsContent>

                    <TabsContent value="status">
                        <div className="space-y-4 rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-medium">
                                    {t('Status history')}
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStatusOpen(true)}
                                >
                                    {t('Change status')}
                                </Button>
                            </div>
                            <Deferred
                                data="statusHistory"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <div
                                                key={n}
                                                className="h-10 w-full animate-pulse rounded bg-muted"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <div className="divide-y">
                                    {statusRows.length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            {t('No status records.')}
                                        </p>
                                    ) : (
                                        statusRows.map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between gap-3 py-3 text-sm"
                                            >
                                                <div className="space-y-0.5">
                                                    <Badge
                                                        variant={
                                                            BASE_STATUS_STYLES[
                                                                row.status
                                                            ] ?? 'outline'
                                                        }
                                                    >
                                                        {t(row.status)}
                                                    </Badge>
                                                    {row.reason ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.reason}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>{row.effective_on}</p>
                                                    {row.recorded_by_name ? (
                                                        <p>
                                                            {
                                                                row.recorded_by_name
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                onPrint={handlePrint}
                onDownload={() => (window.location.href = buildExportUrl())}
                exportMode={exportMode}
                t={t}
            />

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Delete coach')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Are you sure you want to delete this coach? This action cannot be undone.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CoachStatusDialog
                coach={coach}
                open={statusOpen}
                onOpenChange={setStatusOpen}
                t={t}
            />
        </>
    );
}

function EmptyCoachTab({ title, message }: { title: string; message: string }) {
    return (
        <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

function CoachStatusDialog({
    coach,
    open,
    onOpenChange,
    t,
}: {
    coach: Coach;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: (key: string) => string;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [status, setStatus] = useState(coach.coach_status ?? 'ACTIVE');
    const [effectiveOn, setEffectiveOn] = useState(today);
    const [reason, setReason] = useState('');

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.post(
            storeCoachStatus.url(coach),
            {
                status,
                effective_on: effectiveOn,
                reason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReason('');
                    onOpenChange(false);
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{t('Change status')}</DialogTitle>
                        <DialogDescription>
                            {t('Record this change in coach status history.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-1.5">
                            <Label>{t('Status')}</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COACH_STATUSES.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="coach-status-effective-on">
                                {t('Effective date')}
                            </Label>
                            <Input
                                id="coach-status-effective-on"
                                type="date"
                                value={effectiveOn}
                                onChange={(event) =>
                                    setEffectiveOn(event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="coach-status-reason">
                                {t('Reason')}
                            </Label>
                            <Input
                                id="coach-status-reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={!effectiveOn}>
                            {t('Save status')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    selectedColumns,
    setSelectedColumns,
    onPrint,
    onDownload,
    exportMode,
    t,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedColumns: string[];
    setSelectedColumns: Dispatch<SetStateAction<string[]>>;
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
                        {t(
                            'Choose columns, then print or download the current view.',
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
                                    id={`coach-${col.key}`}
                                    checked={selectedColumns.includes(col.key)}
                                    onCheckedChange={(checked) =>
                                        setSelectedColumns((previous) =>
                                            checked
                                                ? previous.includes(col.key)
                                                    ? previous
                                                    : [...previous, col.key]
                                                : previous.filter(
                                                      (k) => k !== col.key,
                                                  ),
                                        )
                                    }
                                />
                                <Label htmlFor={`coach-${col.key}`}>
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
