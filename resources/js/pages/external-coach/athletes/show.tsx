import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Star, TrendingUp, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Athlete = {
    id: number;
    pno: string | null;
    full_name: string;
    gender: string | null;
    player_category: string | null;
    player_level: string | null;
    current_status: string | null;
    sport_event: string | null;
};

type Assignment = {
    id: number;
    start_date: string;
    end_date: string;
    training_start_time: string | null;
    training_end_time: string | null;
    attendance_mode: string;
    status: string;
    training_venue: { name: string };
    sport: { name: string };
    sport_event: { name: string } | null;
};

type Attendance = {
    id: number;
    attendance_date: string;
    attendance_status: string;
    review_status: string;
    review_remarks: string | null;
    reviewed_at: string | null;
    geo_status: string;
    submitted_at: string;
    coach_remarks: string | null;
};

type PerformanceUpdate = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    training_summary: string;
    improvement_notes: string | null;
    review_status: string;
    sport: { name: string };
};

type Props = {
    athlete: Athlete;
    assignments: Assignment[];
    activeTab: 'attendance' | 'performance';
    tabLinks: {
        attendance: string;
        performance: string;
    };
    tabCounts: {
        attendance: number;
        performance: number;
    };
    attendanceFilters?: {
        month: string;
        label: string;
        previous: string;
        current: string;
        next: string;
    };
    performanceFilters?: {
        month: string;
        label: string;
        previous: string;
        current: string;
        next: string;
    };
    attendances?: Attendance[];
    performanceUpdates?: PerformanceUpdate[];
};

export default function ExternalCoachAthleteShow({
    athlete,
    assignments,
    activeTab,
    tabLinks,
    tabCounts,
    attendanceFilters,
    performanceFilters,
    attendances = [],
    performanceUpdates = [],
}: Props) {
    const { t } = useTranslation();
    const activeAssignment = assignments[0];
    const attendanceSummary = buildAttendanceSummary(attendances);
    const performanceSummary = buildPerformanceSummary(performanceUpdates);
    const activeFilters = activeTab === 'performance' ? performanceFilters : attendanceFilters;
    const selectedMonth = parseMonthValue(activeFilters?.month);
    const monthOptions = buildMonthOptions(t);
    const yearOptions = buildYearOptions(selectedMonth.year);

    function filterByMonth(month: string): void {
        router.get(activeTab === 'performance' ? tabLinks.performance : tabLinks.attendance, { month }, { preserveScroll: true, preserveState: true });
    }

    function filterByMonthParts(year: string, month: string): void {
        filterByMonth(`${year}-${month}`);
    }

    return (
        <>
            <Head title={athlete.full_name} />

            <main className="min-h-screen overflow-x-hidden bg-muted/20">
                <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 lg:py-8">
                    <header className="overflow-hidden rounded-lg border bg-card shadow-sm">
                        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                    <UserRound className="size-3.5" />
                                    {t('Assigned athlete')}
                                </div>
                                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{athlete.full_name}</h1>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {athlete.pno ? <span className="rounded-md border px-2 py-1">{athlete.pno}</span> : null}
                                    {athlete.current_status ? (
                                        <Badge variant="outline" className={athleteStatusBadgeClass(athlete.current_status)}>
                                            {t(athlete.current_status)}
                                        </Badge>
                                    ) : null}
                                    {athlete.player_level ? <span className="rounded-md border px-2 py-1">{t(athlete.player_level)}</span> : null}
                                    {athlete.player_category ? <span className="rounded-md border px-2 py-1">{t(athlete.player_category)}</span> : null}
                                </div>
                                {activeAssignment ? (
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-md border bg-muted/30 px-2 py-1">{activeAssignment.sport.name}</span>
                                        <span className="rounded-md border bg-muted/30 px-2 py-1">{activeAssignment.training_venue.name}</span>
                                        <span className="rounded-md border bg-muted/30 px-2 py-1">
                                            {formatDate(activeAssignment.start_date)} - {formatDate(activeAssignment.end_date)}
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid gap-2 sm:flex sm:shrink-0 sm:justify-end">
                                <Button asChild variant="outline" className="w-full sm:w-auto">
                                    <Link href="/external-coach/dashboard">
                                        <ArrowLeft className="size-4" />
                                        {t('Dashboard')}
                                    </Link>
                                </Button>
                                {activeAssignment ? (
                                    <>
                                        <Button asChild variant="outline" className="w-full sm:w-auto">
                                            <Link href={`/external-coach/performance?assignment=${activeAssignment.id}`}>
                                                <TrendingUp className="size-4" />
                                                {t('Update')}
                                            </Link>
                                        </Button>
                                        <Button asChild className="w-full sm:w-auto">
                                            <Link href={`/external-coach/attendance?assignment=${activeAssignment.id}`}>
                                                <ClipboardCheck className="size-4" />
                                                {t('Mark')}
                                            </Link>
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                        <nav className="grid grid-cols-2 border-t bg-muted/20" aria-label={t('Athlete history sections')}>
                            <Link href={tabLinks.attendance} prefetch className={tabLinkClass(activeTab === 'attendance')}>
                                <ClipboardCheck className="size-4" />
                                <span className="min-w-0 truncate">{t('Attendance')}</span>
                                <Badge variant="secondary" className="ml-auto">
                                    {tabCounts.attendance}
                                </Badge>
                            </Link>
                            <Link href={tabLinks.performance} prefetch className={tabLinkClass(activeTab === 'performance')}>
                                <TrendingUp className="size-4" />
                                <span className="min-w-0 truncate">{t('Performance')}</span>
                                <Badge variant="secondary" className="ml-auto">
                                    {tabCounts.performance}
                                </Badge>
                            </Link>
                        </nav>
                    </header>

                    <section className="grid min-w-0 gap-3">
                        {activeTab === 'attendance' ? (
                            <section className="grid min-w-0 gap-3">
                                {attendanceFilters ? (
                                    <section className="rounded-lg border bg-card p-3 shadow-sm">
                                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                                    <CalendarDays className="size-3.5" />
                                                    {t('Month filter')}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">{attendanceFilters.label}</span>
                                                    <InlineStat label={t('Marked')} value={attendanceSummary.total.toString()} />
                                                    <InlineStat label={t('Present')} value={attendanceSummary.present.toString()} />
                                                    <InlineStat label={t('Attention')} value={attendanceSummary.flagged.toString()} tone={attendanceSummary.flagged > 0 ? 'warning' : 'default'} />
                                                    <InlineStat label={t('Last')} value={attendanceSummary.lastDate ? formatDate(attendanceSummary.lastDate) : '-'} />
                                                </div>
                                            </div>
                                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                                                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-md border bg-background shadow-xs sm:grid-cols-[minmax(0,1fr)_96px]">
                                                    <Select value={selectedMonth.month} onValueChange={(month) => filterByMonthParts(selectedMonth.year, month)}>
                                                        <SelectTrigger className="h-9 rounded-none border-0 border-r bg-transparent shadow-none focus:ring-0">
                                                            <SelectValue placeholder={t('Month')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {monthOptions.map((month) => (
                                                                <SelectItem key={month.value} value={month.value}>
                                                                    {month.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={selectedMonth.year} onValueChange={(year) => filterByMonthParts(year, selectedMonth.month)}>
                                                        <SelectTrigger className="h-9 rounded-none border-0 bg-transparent shadow-none focus:ring-0">
                                                            <SelectValue placeholder={t('Year')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {yearOptions.map((year) => (
                                                                <SelectItem key={year} value={year}>
                                                                    {year}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_36px] overflow-hidden rounded-md border bg-background shadow-xs sm:w-auto sm:grid-cols-[40px_minmax(82px,1fr)_40px]">
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none border-r px-2" aria-label={t('Previous month')}>
                                                        <Link href={attendanceFilters.previous} preserveScroll>
                                                            <ChevronLeft className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none border-r px-3">
                                                        <Link href={attendanceFilters.current} preserveScroll>
                                                            {t('Current')}
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none px-2" aria-label={t('Next month')}>
                                                        <Link href={attendanceFilters.next} preserveScroll>
                                                            <ChevronRight className="size-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                ) : null}

                                <HistoryPanel
                                    title={t('Attendance timeline')}
                                    description={t('Review status, location check, and coach notes for recent training days.')}
                                    count={attendances.length}
                                    emptyTitle={t('No attendance submitted')}
                                    icon={<ClipboardCheck className="size-5" />}
                                >
                                    {attendances.map((attendance) => (
                                        <AttendanceRecord key={attendance.id} attendance={attendance} t={t} />
                                    ))}
                                </HistoryPanel>
                            </section>
                        ) : (
                            <section className="grid min-w-0 gap-3">
                                {performanceFilters ? (
                                    <section className="rounded-lg border bg-card p-3 shadow-sm">
                                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                                    <CalendarDays className="size-3.5" />
                                                    {t('Month filter')}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">{performanceFilters.label}</span>
                                                    <InlineStat label={t('Updates')} value={performanceSummary.total.toString()} />
                                                    <InlineStat label={t('Avg score')} value={performanceSummary.averageScore} />
                                                    <InlineStat label={t('Attention')} value={performanceSummary.needsAttention.toString()} tone={performanceSummary.needsAttention > 0 ? 'warning' : 'default'} />
                                                    <InlineStat label={t('Last')} value={performanceSummary.lastDate ? formatDate(performanceSummary.lastDate) : '-'} />
                                                </div>
                                            </div>
                                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                                                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-md border bg-background shadow-xs sm:grid-cols-[minmax(0,1fr)_96px]">
                                                    <Select value={selectedMonth.month} onValueChange={(month) => filterByMonthParts(selectedMonth.year, month)}>
                                                        <SelectTrigger className="h-9 rounded-none border-0 border-r bg-transparent shadow-none focus:ring-0">
                                                            <SelectValue placeholder={t('Month')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {monthOptions.map((month) => (
                                                                <SelectItem key={month.value} value={month.value}>
                                                                    {month.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={selectedMonth.year} onValueChange={(year) => filterByMonthParts(year, selectedMonth.month)}>
                                                        <SelectTrigger className="h-9 rounded-none border-0 bg-transparent shadow-none focus:ring-0">
                                                            <SelectValue placeholder={t('Year')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {yearOptions.map((year) => (
                                                                <SelectItem key={year} value={year}>
                                                                    {year}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_36px] overflow-hidden rounded-md border bg-background shadow-xs sm:w-auto sm:grid-cols-[40px_minmax(82px,1fr)_40px]">
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none border-r px-2" aria-label={t('Previous month')}>
                                                        <Link href={performanceFilters.previous} preserveScroll>
                                                            <ChevronLeft className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none border-r px-3">
                                                        <Link href={performanceFilters.current} preserveScroll>
                                                            {t('Current')}
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm" className="h-9 rounded-none px-2" aria-label={t('Next month')}>
                                                        <Link href={performanceFilters.next} preserveScroll>
                                                            <ChevronRight className="size-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                ) : null}

                                <HistoryPanel
                                    title={t('Performance updates')}
                                    description={t('Recent training progress recorded by you.')}
                                    count={performanceUpdates.length}
                                    emptyTitle={t('No performance updates')}
                                    icon={<TrendingUp className="size-5" />}
                                >
                                    {performanceUpdates.map((update) => (
                                        <article key={update.id} className="grid gap-2 px-4 py-4 sm:px-5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="font-medium">{formatDate(update.update_date)}</div>
                                                {update.performance_score ? (
                                                    <Badge variant="outline" className={performanceScoreBadgeClass(update.performance_score)}>
                                                        <Star className="size-3.5" />
                                                        {update.performance_score}/10
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                <span className="rounded-md border px-2 py-1">{update.sport.name}</span>
                                                {update.performance_level ? (
                                                    <Badge variant="outline" className={performanceLevelBadgeClass(update.performance_level)}>
                                                        {t(update.performance_level)}
                                                    </Badge>
                                                ) : null}
                                                <Badge variant="outline" className={reviewStatusBadgeClass(update.review_status)}>
                                                    {reviewStatusLabel(update.review_status, t)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{update.training_summary}</p>
                                            {update.improvement_notes ? <p className="text-sm text-muted-foreground">{update.improvement_notes}</p> : null}
                                        </article>
                                    ))}
                                </HistoryPanel>
                            </section>
                        )}
                    </section>

                </div>
            </main>
        </>
    );
}

function InlineStat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' }) {
    const toneClass = tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-100' : 'border-border bg-background text-foreground';

    return (
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${toneClass}`}>
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </span>
    );
}

function AttendanceRecord({ attendance, t }: { attendance: Attendance; t: (key: string) => string }) {
    return (
        <article className="grid gap-3 px-4 py-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:px-5">
            <div className="min-w-0">
                <div className="text-sm font-semibold">{formatDate(attendance.attendance_date)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(attendance.submitted_at)}</div>
            </div>

            <div className="grid min-w-0 gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={attendanceStatusBadgeClass(attendance.attendance_status)}>
                        {attendanceStatusLabel(attendance.attendance_status, t)}
                    </Badge>
                    <Badge variant="outline" className={reviewStatusBadgeClass(attendance.review_status)}>
                        {reviewStatusLabel(attendance.review_status, t)}
                    </Badge>
                    {attendance.review_status === 'corrected' ? (
                        <Badge variant="outline" className={attendanceStatusBadgeClass(attendance.attendance_status)}>
                            {t('Corrected to')} {attendanceStatusLabel(attendance.attendance_status, t)}
                        </Badge>
                    ) : null}
                    <Badge variant="outline" className={geoStatusBadgeClass(attendance.geo_status)}>
                        {geoStatusLabel(attendance.geo_status, t)}
                    </Badge>
                </div>

                {attendance.coach_remarks || attendance.review_remarks ? (
                    <div className="grid gap-2">
                        {attendance.coach_remarks ? <p className="text-sm text-muted-foreground">{attendance.coach_remarks}</p> : null}
                        {attendance.review_status === 'corrected' && attendance.review_remarks ? (
                            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-100">
                                {attendance.review_remarks}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

function HistoryPanel({
    title,
    description,
    count,
    emptyTitle,
    icon,
    children,
}: {
    title: string;
    description: string;
    count: number;
    emptyTitle: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Badge variant="secondary">{count}</Badge>
            </div>

            {count > 0 ? (
                <div className="divide-y">{children}</div>
            ) : (
                <div className="px-4 py-10 text-center sm:px-5">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
                    <h3 className="mt-3 text-sm font-medium">{emptyTitle}</h3>
                </div>
            )}
        </section>
    );
}

function tabLinkClass(isActive: boolean): string {
    const baseClass = 'flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4';

    return isActive
        ? `${baseClass} bg-primary text-primary-foreground`
        : `${baseClass} text-muted-foreground hover:bg-muted hover:text-foreground`;
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

function formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function parseMonthValue(value: string | undefined): { year: string; month: string } {
    const fallback = new Date();
    const [year, month] = value?.split('-') ?? [];

    if (year && month) {
        return { year, month };
    }

    return {
        year: String(fallback.getFullYear()),
        month: String(fallback.getMonth() + 1).padStart(2, '0'),
    };
}

function buildMonthOptions(t: (key: string) => string): Array<{ value: string; label: string }> {
    return [
        ['01', 'January'],
        ['02', 'February'],
        ['03', 'March'],
        ['04', 'April'],
        ['05', 'May'],
        ['06', 'June'],
        ['07', 'July'],
        ['08', 'August'],
        ['09', 'September'],
        ['10', 'October'],
        ['11', 'November'],
        ['12', 'December'],
    ].map(([value, label]) => ({ value, label: t(label) }));
}

function buildYearOptions(selectedYear: string): string[] {
    const currentYear = new Date().getFullYear();
    const years = new Set<string>([selectedYear]);

    for (let offset = -2; offset <= 1; offset += 1) {
        years.add(String(currentYear + offset));
    }

    return Array.from(years).sort((first, second) => Number(second) - Number(first));
}

function buildAttendanceSummary(attendances: Attendance[]): {
    total: number;
    present: number;
    pending: number;
    flagged: number;
    lastDate: string | null;
} {
    return {
        total: attendances.length,
        present: attendances.filter((attendance) => attendance.attendance_status === 'present').length,
        pending: attendances.filter((attendance) => attendance.review_status === 'pending').length,
        flagged: attendances.filter((attendance) => attendance.geo_status !== 'valid' || ['rejected', 'needs_correction'].includes(attendance.review_status)).length,
        lastDate: attendances[0]?.attendance_date ?? null,
    };
}

function buildPerformanceSummary(updates: PerformanceUpdate[]): {
    total: number;
    averageScore: string;
    needsAttention: number;
    lastDate: string | null;
} {
    const scoredUpdates = updates.filter((update) => update.performance_score !== null);
    const scoreTotal = scoredUpdates.reduce((total, update) => total + (update.performance_score ?? 0), 0);

    return {
        total: updates.length,
        averageScore: scoredUpdates.length > 0 ? (scoreTotal / scoredUpdates.length).toFixed(1) : '-',
        needsAttention: updates.filter((update) => update.performance_level === 'needs_attention' || ['rejected', 'needs_correction'].includes(update.review_status)).length,
        lastDate: updates[0]?.update_date ?? null,
    };
}

function attendanceStatusLabel(status: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        present: t('Present'),
        absent: t('Absent'),
        late: t('Late'),
        excused: t('Excused'),
        not_marked: t('Not marked'),
    };

    return labels[status] ?? t(status);
}

function athleteStatusBadgeClass(status: string): string {
    switch (status) {
        case 'active':
        case 'approved':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'inactive':
        case 'suspended':
        case 'blocked':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'pending_invite':
        case 'pending':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function attendanceStatusBadgeClass(status: string): string {
    switch (status) {
        case 'present':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'late':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        case 'absent':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'excused':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'not_marked':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function reviewStatusLabel(status: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        pending: t('Under review'),
        accepted: t('Accepted'),
        rejected: t('Rejected'),
        corrected: t('Corrected'),
        needs_correction: t('Needs correction'),
        locked: t('Locked'),
    };

    return labels[status] ?? t(status);
}

function reviewStatusBadgeClass(reviewStatus: string): string {
    switch (reviewStatus) {
        case 'pending':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        case 'accepted':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'rejected':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'corrected':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'needs_correction':
            return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700/70 dark:bg-blue-900/20 dark:text-blue-200';
        case 'locked':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function geoStatusLabel(status: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        valid: t('Location verified'),
        outside_radius: t('Outside venue radius'),
        location_missing: t('Location missing'),
        location_permission_denied: t('Location denied'),
        low_accuracy: t('Low GPS accuracy'),
        outside_training_time: t('Outside training time'),
        manual_review_required: t('Manual review required'),
    };

    return labels[status] ?? t(status);
}

function geoStatusBadgeClass(status: string): string {
    switch (status) {
        case 'valid':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'outside_radius':
        case 'outside_training_time':
            return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
        case 'low_accuracy':
            return 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700/70 dark:bg-orange-900/20 dark:text-orange-200';
        case 'location_permission_denied':
        case 'location_missing':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        case 'manual_review_required':
            return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700/70 dark:bg-blue-900/20 dark:text-blue-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function performanceLevelBadgeClass(level: string): string {
    switch (level) {
        case 'excellent':
            return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
        case 'improving':
            return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/20 dark:text-sky-200';
        case 'stable':
            return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/20 dark:text-slate-200';
        case 'needs_attention':
            return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
        default:
            return 'border-muted bg-muted text-muted-foreground';
    }
}

function performanceScoreBadgeClass(score: number | null): string {
    if (score === null) {
        return 'border-muted bg-muted text-muted-foreground';
    }

    if (score >= 9) {
        return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-200';
    }

    if (score >= 7) {
        return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700/70 dark:bg-blue-900/20 dark:text-blue-200';
    }

    if (score >= 5) {
        return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/20 dark:text-amber-200';
    }

    return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-900/20 dark:text-rose-200';
}
