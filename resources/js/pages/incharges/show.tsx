import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Edit, Mail, Phone, ShieldCheck } from 'lucide-react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import {
    changelog as inchargeChangelog,
    teams as inchargeTeams,
} from '@/actions/App/Http/Controllers/InchargeProfileTabController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type Incharge = {
    id: number;
    full_name: string;
    pno: string;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    is_active: boolean;
    remarks: string | null;
};

type Assignment = {
    id: number;
    assigned_at: string | null;
    removed_at: string | null;
    assignment_reason: string | null;
    removal_reason: string | null;
    is_current: boolean;
    team: {
        id: number;
        name: string;
        sport: { id: number; name: string } | null;
        session: { id: number; name: string } | null;
        unit: { id: number; name: string } | null;
        district: { id: number; name: string } | null;
    } | null;
};

type AuditEntry = {
    id: number;
    action: string;
    subject: string;
    at: string;
    by: string | null;
    changes: { field: string; old: string | null; new: string | null }[];
};

function displayValue(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === '' ? '' : String(value);
}

export default function InchargesShow({
    incharge,
    activeTab,
    summary,
    assignments,
    auditLog,
}: {
    incharge: Incharge;
    activeTab: 'overview' | 'teams' | 'changelog';
    summary?: { current_teams_count: number; total_assignments_count: number };
    assignments?: Assignment[];
    auditLog?: AuditEntry[];
}) {
    const { t } = useTranslation();

    const tabs = [
        { value: 'overview', label: t('Overview'), href: InchargeController.show.url(incharge.id) },
        { value: 'teams', label: t('Teams'), href: inchargeTeams.url(incharge.id) },
        { value: 'changelog', label: t('Changelog'), href: inchargeChangelog.url(incharge.id) },
    ] as const;

    return (
        <>
            <Head title={incharge.full_name} />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading title={incharge.full_name} description={`${t('PNO')}: ${incharge.pno}`} />
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={InchargeController.index.url()}>
                                <ArrowLeft className="size-4" />
                                {t('Back')}
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={InchargeController.edit.url(incharge.id)}>
                                <Edit className="size-4" />
                                {t('Edit team prabhari')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border bg-card p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="size-5 text-muted-foreground" />
                                <span className="font-medium">{displayValue(incharge.rank)}</span>
                                {incharge.rank && incharge.designation ? (
                                    <span className="text-muted-foreground">·</span>
                                ) : null}
                                <span className="text-muted-foreground">{displayValue(incharge.designation)}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <Phone className="size-4" />
                                    {displayValue(incharge.mobile)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Mail className="size-4" />
                                    {displayValue(incharge.email)}
                                </span>
                            </div>
                        </div>
                        <Badge variant={incharge.is_active ? 'default' : 'secondary'}>
                            {incharge.is_active ? t('Active') : t('Inactive')}
                        </Badge>
                    </div>
                </div>

                <Tabs value={activeTab}>
                    <TabsList>
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value} asChild>
                                <Link href={tab.href} prefetch>
                                    {tab.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview" className="mt-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-md border bg-card p-4">
                                <p className="text-sm text-muted-foreground">{t('Current teams')}</p>
                                <p className="mt-2 text-2xl font-semibold">{summary?.current_teams_count ?? 0}</p>
                            </div>
                            <div className="rounded-md border bg-card p-4">
                                <p className="text-sm text-muted-foreground">{t('Total assignments')}</p>
                                <p className="mt-2 text-2xl font-semibold">{summary?.total_assignments_count ?? 0}</p>
                            </div>
                            <div className="rounded-md border bg-card p-4">
                                <p className="text-sm text-muted-foreground">{t('Remarks')}</p>
                                <p className="mt-2 text-sm">{displayValue(incharge.remarks)}</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="teams" className="mt-4">
                        <div className="overflow-hidden rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Team')}</TableHead>
                                        <TableHead>{t('Assigned on')}</TableHead>
                                        <TableHead>{t('Removed on')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Reason')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(assignments ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                {t('No team assignments recorded yet.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (assignments ?? []).map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell>
                                                    <div className="font-medium">{assignment.team?.name ?? ''}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {assignment.team?.sport?.name ?? ''}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{displayValue(assignment.assigned_at)}</TableCell>
                                                <TableCell>{displayValue(assignment.removed_at)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={assignment.is_current ? 'default' : 'secondary'}>
                                                        {assignment.is_current ? t('Current') : t('Past')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{displayValue(assignment.assignment_reason ?? assignment.removal_reason)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="changelog" className="mt-4">
                        <div className="space-y-3">
                            {(auditLog ?? []).length === 0 ? (
                                <div className="rounded-md border bg-card p-6 text-center text-muted-foreground">
                                    {t('No changelog entries recorded yet.')}
                                </div>
                            ) : (
                                (auditLog ?? []).map((entry) => (
                                    <div key={entry.id} className="rounded-md border bg-card p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium">
                                                {entry.subject} · {entry.action}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.at} · {entry.by ?? t('System')}
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-1 text-sm">
                                            {entry.changes.map((change, index) => (
                                                <div key={`${entry.id}-${change.field}-${index}`} className="text-muted-foreground">
                                                    <span className="font-medium text-foreground">{change.field}</span>: {displayValue(change.old)} →{' '}
                                                    {displayValue(change.new)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

InchargesShow.layout = {
    breadcrumbs: [{ title: 'Team Prabhari', href: InchargeController.index.url() }],
};
