import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Attendance = {
    id: number;
    attendance_date: string;
    attendance_status: string;
    geo_status: string;
    review_status: string;
    flag_reason: string | null;
    coach_remarks: string | null;
    review_remarks: string | null;
    submitted_at: string;
    submitted_latitude: string | null;
    submitted_longitude: string | null;
    submitted_gps_accuracy: number | null;
    distance_from_venue_meters: string | null;
    venue_latitude_snapshot: string | null;
    venue_longitude_snapshot: string | null;
    allowed_radius_meters_snapshot: number | null;
    ip_address: string | null;
    user_agent: string | null;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string; email: string | null; phone: string | null };
    training_venue: { name: string; address: string | null };
    assignment: {
        start_date: string;
        end_date: string;
        status: string;
        sport: { name: string } | null;
    } | null;
    reviewer: { name: string } | null;
    photo: {
        name: string | null;
        preview_url: string;
        download_url: string;
    };
};

type Props = {
    attendance: Attendance;
    reviewActions: string[];
    attendanceStatuses: string[];
};

export default function ExternalTrainingAttendanceShow({
    attendance,
    reviewActions,
    attendanceStatuses,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Review attendance')} />

            <div className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {t('Review attendance')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {attendance.member.full_name} · {attendance.training_venue.name}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/external-training-attendances">{t('Back')}</Link>
                    </Button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                    <section className="space-y-4">
                        <div className="rounded-lg border p-4">
                            <div className="mb-3 flex flex-wrap gap-2">
                                <Badge>{t(attendance.attendance_status)}</Badge>
                                <Badge variant={attendance.geo_status === 'valid' ? 'secondary' : 'destructive'}>
                                    {t(attendance.geo_status)}
                                </Badge>
                                <Badge variant="outline">{t(attendance.review_status)}</Badge>
                            </div>
                            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-muted-foreground">{t('Member')}</dt>
                                    <dd>{attendance.member.full_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('External coach')}</dt>
                                    <dd>{attendance.external_coach.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Venue')}</dt>
                                    <dd>{attendance.training_venue.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Sport')}</dt>
                                    <dd>{attendance.assignment?.sport?.name ?? '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Submitted coordinates')}</dt>
                                    <dd>
                                        {attendance.submitted_latitude ?? '-'}, {attendance.submitted_longitude ?? '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Venue coordinates')}</dt>
                                    <dd>
                                        {attendance.venue_latitude_snapshot ?? '-'}, {attendance.venue_longitude_snapshot ?? '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Allowed radius')}</dt>
                                    <dd>{attendance.allowed_radius_meters_snapshot ?? '-'} m</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('Distance')}</dt>
                                    <dd>{attendance.distance_from_venue_meters ?? '-'} m</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('GPS accuracy')}</dt>
                                    <dd>{attendance.submitted_gps_accuracy ?? '-'} m</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t('IP address')}</dt>
                                    <dd>{attendance.ip_address ?? '-'}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-lg border p-4 text-sm">
                            <h2 className="mb-3 font-medium">{t('Remarks')}</h2>
                            <p className="text-muted-foreground">{attendance.coach_remarks ?? '-'}</p>
                            <p className="mt-3 text-destructive">{attendance.flag_reason ?? ''}</p>
                            <p className="mt-3">{attendance.review_remarks ?? ''}</p>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <a href={attendance.photo.preview_url} target="_blank" rel="noreferrer">
                            <img
                                src={attendance.photo.preview_url}
                                alt={attendance.photo.name ?? t('Proof photo')}
                                className="aspect-[4/3] w-full rounded-lg border object-cover"
                            />
                        </a>

                        <Form
                            action={`/external-training-attendances/${attendance.id}/review`}
                            method="post"
                            className="space-y-4 rounded-lg border p-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <input type="hidden" name="_method" value="patch" />
                                    <div className="grid gap-2">
                                        <Label htmlFor="action">{t('Action')}</Label>
                                        <Select name="action" required>
                                            <SelectTrigger id="action">
                                                <SelectValue placeholder={t('Select action')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reviewActions.map((action) => (
                                                    <SelectItem key={action} value={action}>
                                                        {t(action)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.action} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="attendance_status">{t('Corrected status')}</Label>
                                        <Select name="attendance_status">
                                            <SelectTrigger id="attendance_status">
                                                <SelectValue placeholder={t('Select status')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attendanceStatuses.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {t(status)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.attendance_status} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="review_remarks">{t('Review remarks')}</Label>
                                        <Textarea id="review_remarks" name="review_remarks" rows={4} />
                                        <InputError message={errors.review_remarks} />
                                    </div>

                                    <Button type="submit" disabled={processing} className="w-full">
                                        {t('Save review')}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </aside>
                </div>
            </div>
        </>
    );
}
