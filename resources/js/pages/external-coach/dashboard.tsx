import { Form, Head, Link } from '@inertiajs/react';
import { Activity, CalendarDays, ClipboardCheck, Eye, LogOut, MapPin, TrendingUp, Users } from 'lucide-react';

import type { PaginatedListing } from '@/components/listing-pagination';
import { ListingPagination } from '@/components/listing-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';

type Assignment = {
    id: number;
    start_date: string;
    end_date: string;
    training_start_time: string | null;
    training_end_time: string | null;
    member: {
        id: number;
        pno: string | null;
        full_name: string;
        current_status: string | null;
    };
    training_venue: {
        name: string;
    };
    sport: {
        name: string;
    };
};

type Props = {
    assignments: PaginatedListing & {
        data: Assignment[];
    };
    summary: {
        active_assignments: number;
        sports_covered: number;
        training_venues: number;
    };
    filters: {
        pno: string;
    };
};

export default function ExternalCoachDashboard({ assignments, summary, filters }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External coach dashboard')} />

            <main className="min-h-screen bg-muted/20">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 lg:py-8">
                    <header className="rounded-lg border bg-card px-4 py-4 shadow-sm sm:px-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                    <ClipboardCheck className="size-3.5" />
                                    {t('External training portal')}
                                </div>
                                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                                    {t('External coach dashboard')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Review assigned athletes and submit attendance or performance updates.')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                                <Button asChild variant="outline" className="w-full sm:w-auto">
                                    <Link href="/external-coach/performance">
                                        <TrendingUp className="size-4" />
                                        {t('Performance')}
                                    </Link>
                                </Button>
                                <Button asChild className="w-full sm:w-auto">
                                    <Link href="/external-coach/attendance">
                                        <ClipboardCheck className="size-4" />
                                        {t('Attendance')}
                                    </Link>
                                </Button>

                                <Form action="/external-coach/logout" method="post" className="col-span-2 sm:col-span-1">
                                    {({ processing }) => (
                                        <Button type="submit" variant="ghost" disabled={processing} aria-label={t('Log out')} className="w-full sm:w-auto">
                                            <LogOut className="size-4" />
                                            {t('Log out')}
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        </div>
                    </header>

                    <section className="grid grid-cols-3 gap-2 sm:gap-3">
                        <SummaryTile icon={Users} label={t('Assigned athletes')} value={summary.active_assignments} />
                        <SummaryTile icon={Activity} label={t('Sports covered')} value={summary.sports_covered} />
                        <SummaryTile icon={MapPin} label={t('Training venues')} value={summary.training_venues} />
                    </section>

                    <section className="rounded-lg border bg-card shadow-sm">
                        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div>
                                <h2 className="text-sm font-semibold">{t('Assigned athletes')}</h2>
                                <p className="text-xs text-muted-foreground">
                                    {t('Active external training assignments available for attendance and performance updates.')}
                                </p>
                            </div>
                            <form action="/external-coach/dashboard" method="get" className="grid gap-2 sm:w-72 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <Input name="pno" defaultValue={filters.pno} placeholder={t('Search PNO')} inputMode="search" className="h-9" />
                                <Button type="submit" size="sm" className="w-full sm:w-auto">
                                    {t('Search')}
                                </Button>
                            </form>
                        </div>

                        {assignments.data.length > 0 ? (
                            <div className="divide-y">
                                {assignments.data.map((assignment) => (
                                    <article key={assignment.id} className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)_auto] xl:items-center">
                                        <AssignedAthlete assignment={assignment} />
                                        <AssignmentSchedule assignment={assignment} />
                                        <div className="grid grid-cols-3 gap-2 xl:flex xl:justify-end">
                                            <Button asChild size="sm" variant="outline" className="w-full lg:w-auto">
                                                <Link href={`/external-coach/athletes/${assignment.member.id}`}>
                                                    <Eye className="size-4" />
                                                    {t('View')}
                                                </Link>
                                            </Button>
                                            <Button asChild size="sm" variant="outline" className="w-full lg:w-auto">
                                                <Link href={`/external-coach/performance?assignment=${assignment.id}`}>
                                                    <TrendingUp className="size-4" />
                                                    {t('Update')}
                                                </Link>
                                            </Button>
                                            <Button asChild size="sm" className="w-full lg:w-auto">
                                                <Link href={`/external-coach/attendance?assignment=${assignment.id}`}>
                                                    <ClipboardCheck className="size-4" />
                                                    {t('Mark')}
                                                </Link>
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-10 text-center sm:px-5">
                                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Users className="size-5" />
                                </div>
                                <h3 className="mt-3 text-sm font-medium">{t('No assigned athletes')}</h3>
                                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                                    {t('Active assignments created by the sports unit will appear here for attendance and performance reporting.')}
                                </p>
                            </div>
                        )}
                    </section>

                    <ListingPagination paginator={assignments} itemLabel={t('athletes')} />
                </div>
            </main>
        </>
    );
}

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
    return (
        <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                    <div className="truncate text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">{label}</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
                </div>
                <div className="hidden size-9 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex">
                    <Icon className="size-4" />
                </div>
            </div>
        </div>
    );
}

function AssignedAthlete({ assignment }: { assignment: Assignment }) {
    const { t } = useTranslation();
    const identity = assignment.member.pno ?? t('No PNO');

    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate font-medium">{assignment.member.full_name}</h3>
                <Badge variant="outline" className={memberStatusBadgeClass(assignment.member.current_status ?? 'unknown')}>
                    {assignment.member.current_status ?? t('Unknown status')}
                </Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{identity}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border px-2 py-1">{assignment.sport.name}</span>
                <span className="rounded-md border px-2 py-1">{assignment.training_venue.name}</span>
            </div>
        </div>
    );
}

function AssignmentSchedule({ assignment }: { assignment: Assignment }) {
    const range = `${formatDate(assignment.start_date)} - ${formatDate(assignment.end_date)}`;
    const time = [assignment.training_start_time, assignment.training_end_time].filter(Boolean).join(' - ');

    return (
        <div className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground xl:justify-end xl:text-right">
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
                <div className="whitespace-normal break-words leading-snug">{range}</div>
                {time ? <div className="text-xs">{time}</div> : null}
            </div>
        </div>
    );
}

function memberStatusBadgeClass(status: string): string {
    switch (status) {
        case 'active':
        case 'approved':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'inactive':
        case 'suspended':
        case 'blocked':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'pending':
        case 'pending_invite':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}
