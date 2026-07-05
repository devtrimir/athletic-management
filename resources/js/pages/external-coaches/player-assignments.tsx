import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink } from 'lucide-react';

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
import { useTranslation } from '@/hooks/use-translation';

type Member = {
    id: number;
    full_name: string;
    pno: string | null;
    mobile: string | null;
    current_status: string | null;
    rank: string | null;
};

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
};

type Assignment = {
    id: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
    attendance_mode: string;
    sport?: {
        id: number;
        name: string;
    } | null;
    training_venue?: {
        id: number;
        name: string;
    } | null;
};

type Attendance = {
    id: number;
    external_coaching_assignment_id: number;
    attendance_date: string;
    attendance_status: string;
    review_status: string;
    geo_status: string;
    distance_from_venue_meters: string | number | null;
    submitted_at: string;
    coach_remarks: string | null;
    review_remarks: string | null;
};

type MonthFilter = {
    month: string;
    label: string;
    previous: string;
    current: string;
    next: string;
};

type Props = {
    externalCoach: ExternalCoach;
    member: Member;
    assignments: Assignment[];
    attendances: Attendance[];
    attendanceFilters: MonthFilter;
};

function formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function ExternalCoachPlayerAssignments({
    externalCoach,
    member,
    assignments,
    attendances,
    attendanceFilters,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={`${member.full_name} - ${t('Assignments')}`} />
            <div className="space-y-6 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">
                        {t('Player assignments')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {member.full_name} · {t('Coach')}: {externalCoach.name}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/external-coaches/${externalCoach.id}/assignments`}>
                            <ExternalLink className="mr-2 size-4" />
                            {t('Back to coach assignments')}
                        </Link>
                    </Button>
                </div>

                <section className="rounded-lg border bg-card p-5">
                    <h2 className="mb-3 text-base font-semibold">{t('Player details')}</h2>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                            <span className="text-muted-foreground">{t('Name')}:</span>{' '}
                            {member.full_name}
                        </div>
                        <div>
                            <span className="text-muted-foreground">{t('PNO')}:</span>{' '}
                            {member.pno ?? '-'}
                        </div>
                        <div>
                            <span className="text-muted-foreground">{t('Mobile')}:</span>{' '}
                            {member.mobile ?? '-'}
                        </div>
                        <div>
                            <span className="text-muted-foreground">{t('Rank')}:</span>{' '}
                            {member.rank ?? '-'}
                        </div>
                    </div>
                </section>

                <section className="rounded-lg border bg-card p-5">
                    <h2 className="mb-3 text-base font-semibold">
                        {t('All assignments by this coach')}
                    </h2>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Sport')}</TableHead>
                                    <TableHead>{t('Venue')}</TableHead>
                                    <TableHead>{t('Attendance mode')}</TableHead>
                                    <TableHead>{t('Period')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-muted-foreground">
                                            {t('No assignments found.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell>{assignment.sport?.name ?? '-'}</TableCell>
                                            <TableCell>{assignment.training_venue?.name ?? '-'}</TableCell>
                                            <TableCell>{assignment.attendance_mode}</TableCell>
                                            <TableCell>{`${formatDate(assignment.start_date ?? '-')}`} → {`${formatDate(assignment.end_date ?? '-')}`}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{t(assignment.status)}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <section className="rounded-lg border bg-card p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">
                            {t('Attendance related data')} · {attendanceFilters.label}
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href={attendanceFilters.previous}>
                                    <ChevronLeft className="mr-1.5 size-4" />
                                    {t('Previous')}
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href={attendanceFilters.current}>
                                    <CalendarDays className="mr-1.5 size-4" />
                                    {t('Current month')}
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href={attendanceFilters.next}>
                                    {t('Next')}
                                    <ChevronRight className="ml-1.5 size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Attendance status')}</TableHead>
                                    <TableHead>{t('Review status')}</TableHead>
                                    <TableHead>{t('Geo status')}</TableHead>
                                    <TableHead>{t('Distance')}</TableHead>
                                    <TableHead>{t('Submitted at')}</TableHead>
                                    <TableHead>{t('Remarks')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendances.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-muted-foreground">
                                            {t('No attendance records found.')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    attendances.map((attendance) => (
                                        <TableRow key={attendance.id}>
                                            <TableCell>{formatDate(attendance.attendance_date)}</TableCell>
                                            <TableCell>{t(attendance.attendance_status)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{t(attendance.review_status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={attendance.geo_status === 'valid' ? 'secondary' : 'destructive'}
                                                >
                                                    {t(attendance.geo_status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {attendance.distance_from_venue_meters ?? '-'}
                                            </TableCell>
                                            <TableCell>{attendance.submitted_at}</TableCell>
                                            <TableCell>
                                                {attendance.review_remarks ??
                                                    attendance.coach_remarks ??
                                                    '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </>
    );
}
