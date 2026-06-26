import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, ClipboardCheck, Dumbbell, MapPin, Star, TrendingUp, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    attendances: Attendance[];
    performanceUpdates: PerformanceUpdate[];
};

export default function ExternalCoachAthleteShow({ athlete, assignments, attendances, performanceUpdates }: Props) {
    const { t } = useTranslation();
    const activeAssignment = assignments[0];

    return (
        <>
            <Head title={athlete.full_name} />

            <main className="min-h-screen bg-muted/20">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 lg:py-8">
                    <header className="rounded-lg border bg-card px-4 py-4 shadow-sm sm:px-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                    <UserRound className="size-3.5" />
                                    {t('Assigned athlete')}
                                </div>
                                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{athlete.full_name}</h1>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {athlete.pno ? <span className="rounded-md border px-2 py-1">{athlete.pno}</span> : null}
                                    {athlete.current_status ? <Badge variant="outline">{t(athlete.current_status)}</Badge> : null}
                                    {athlete.player_level ? <span className="rounded-md border px-2 py-1">{t(athlete.player_level)}</span> : null}
                                    {athlete.player_category ? <span className="rounded-md border px-2 py-1">{t(athlete.player_category)}</span> : null}
                                </div>
                            </div>

                            <Button asChild variant="outline" className="w-full sm:w-auto">
                                <Link href="/external-coach/dashboard">
                                    <ArrowLeft className="size-4" />
                                    {t('Dashboard')}
                                </Link>
                            </Button>
                        </div>
                    </header>

                    {activeAssignment ? (
                        <section className="grid gap-3 sm:grid-cols-3">
                            <InfoTile icon={Dumbbell} label={t('Sport')} value={activeAssignment.sport.name} />
                            <InfoTile icon={MapPin} label={t('Venue')} value={activeAssignment.training_venue.name} />
                            <InfoTile icon={CalendarDays} label={t('Assignment')} value={`${formatDate(activeAssignment.start_date)} - ${formatDate(activeAssignment.end_date)}`} />
                        </section>
                    ) : null}

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <HistoryPanel
                            title={t('Attendance history')}
                            description={t('Recent attendance submitted by you for this athlete.')}
                            count={attendances.length}
                            emptyTitle={t('No attendance submitted')}
                            icon={<ClipboardCheck className="size-5" />}
                        >
                            {attendances.map((attendance) => (
                                <article key={attendance.id} className="grid gap-2 px-4 py-4 sm:px-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-medium">{formatDate(attendance.attendance_date)}</div>
                                        <Badge variant="outline">{attendanceStatusLabel(attendance.attendance_status, t)}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-md border px-2 py-1">{reviewStatusLabel(attendance.review_status, t)}</span>
                                        <span className="rounded-md border px-2 py-1">{geoStatusLabel(attendance.geo_status, t)}</span>
                                    </div>
                                    {attendance.coach_remarks ? <p className="text-sm text-muted-foreground">{attendance.coach_remarks}</p> : null}
                                </article>
                            ))}
                        </HistoryPanel>

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
                                            <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium">
                                                <Star className="size-3.5" />
                                                {update.performance_score}/10
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-md border px-2 py-1">{update.sport.name}</span>
                                        {update.performance_level ? <span className="rounded-md border px-2 py-1">{t(update.performance_level)}</span> : null}
                                        <span className="rounded-md border px-2 py-1">{reviewStatusLabel(update.review_status, t)}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{update.training_summary}</p>
                                    {update.improvement_notes ? <p className="text-sm text-muted-foreground">{update.improvement_notes}</p> : null}
                                </article>
                            ))}
                        </HistoryPanel>
                    </section>

                    {activeAssignment ? (
                        <section className="sticky bottom-0 -mx-3 grid grid-cols-2 gap-2 border-t bg-card/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:border sm:bg-card sm:p-4 sm:shadow-sm sm:backdrop-blur-none">
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
                        </section>
                    ) : null}
                </div>
            </main>
        </>
    );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Dumbbell; label: string; value: string }) {
    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="mt-1 truncate text-sm font-semibold">{value}</div>
                </div>
            </div>
        </div>
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
