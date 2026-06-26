import { Head, Link } from '@inertiajs/react';

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

type Attendance = {
    id: number;
    attendance_date: string;
    attendance_status: string;
    geo_status: string;
    review_status: string;
    distance_from_venue_meters: string | null;
    flag_reason: string | null;
    submitted_at: string;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string };
    training_venue: { name: string };
    assignment: { sport: { name: string } | null } | null;
    reviewer: { name: string } | null;
};

type Props = {
    attendances: {
        data: Attendance[];
        from: number | null;
    };
};

export default function ExternalTrainingAttendanceIndex({ attendances }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('External training attendance')} />

            <div className="space-y-4 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {t('External training attendance')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('Review submitted external training proof and geo flags.')}
                    </p>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('S.No.')}</TableHead>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Member')}</TableHead>
                                <TableHead>{t('External coach')}</TableHead>
                                <TableHead>{t('Venue')}</TableHead>
                                <TableHead>{t('Sport')}</TableHead>
                                <TableHead>{t('Geo status')}</TableHead>
                                <TableHead>{t('Review status')}</TableHead>
                                <TableHead>{t('Distance')}</TableHead>
                                <TableHead>{t('Action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.data.map((attendance, index) => (
                                <TableRow key={attendance.id}>
                                    <TableCell>{(attendances.from ?? 1) + index}</TableCell>
                                    <TableCell>{attendance.attendance_date}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{attendance.member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {attendance.member.member_code ?? attendance.member.pno}
                                        </div>
                                    </TableCell>
                                    <TableCell>{attendance.external_coach.name}</TableCell>
                                    <TableCell>{attendance.training_venue.name}</TableCell>
                                    <TableCell>{attendance.assignment?.sport?.name ?? '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={attendance.geo_status === 'valid' ? 'secondary' : 'destructive'}>
                                            {t(attendance.geo_status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t(attendance.review_status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {attendance.distance_from_venue_meters ?? '-'} m
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/external-training-attendances/${attendance.id}`}>
                                                {t('Review')}
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}
